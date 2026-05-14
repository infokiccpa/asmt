import os
import uuid
import shutil
import asyncio
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from typing import Dict
from core.extractor import PDFExtractor
from core.nlp_parser import QuestionParser
from core.ai_extractor import AIExtractor
from api.deps import verify_api_key

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

router = APIRouter()
extractor = PDFExtractor()
parser = QuestionParser()
ai_extractor = AIExtractor()

@router.post("/upload", dependencies=[Depends(verify_api_key)])
async def upload_pdf(file: UploadFile = File(...)) -> Dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    temp_path = f"tmp_{uuid.uuid4().hex}.pdf"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(temp_path)
        if file_size > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

        with open(temp_path, "rb") as f:
            magic = f.read(5)
        if magic != b"%PDF-":
            raise HTTPException(status_code=400, detail="File content is not a valid PDF")
            
        extracted_pages = extractor.extract_text(temp_path)
        
        # 1. Try traditional parsing (fast, handles diagrams)
        questions = parser.extract_questions(extracted_pages)
        
        # 2. AI Extraction fallback/refinement
        has_ocr_error = any("OCR Engine Error" in p["text"] for p in extracted_pages)
        full_text = "\n".join([p["text"] for p in extracted_pages])
        
        # Calculate alphanumeric density
        alnum_chars = sum(c.isalnum() for c in full_text)
        text_density = alnum_chars / len(full_text) if len(full_text) > 0 else 0
        
        # Trigger AI if:
        # - No questions were found by traditional parser
        # - OR text extraction seems to have failed (e.g. OCR error messages)
        # - OR there are pages but very few questions found (heuristic)
        # - OR text density is very low (lots of non-alphanumeric noise)
        # - OR there are diagrams (AI is better at integrating diagrams into questions)
        has_diagrams = any(p["images_count"] > 0 for p in extracted_pages)
        is_poor_extraction = has_ocr_error or (len(full_text) > 100 and text_density < 0.4)
        too_few_questions = len(questions) < 2 and len(full_text) > 300
        
        extraction_method = "Traditional"
        
        if ai_extractor.client:
            # Multi-modal AI Extraction (Primary fallback/refinement)
            if (len(questions) < 2 or is_poor_extraction or too_few_questions or has_diagrams) and len(full_text.strip()) > 50:
                print(f"Triggering Multi-modal AI Extraction for {file.filename}")
                all_ai_questions = []
                
                # Process in sliding windows of 5 pages with a 2-page overlap
                # to ensure questions spanning across pages are not missed.
                batch_size = 5
                overlap = 2
                
                tasks = []
                for i in range(0, len(extracted_pages), batch_size - overlap):
                    batch_pages = extracted_pages[i:i + batch_size]
                    if not batch_pages:
                        break
                        
                    batch_text = "\n\n".join([p["text"] for p in batch_pages])
                    batch_images = []
                    for p in batch_pages:
                        batch_images.extend(p.get("images", []))
                    
                    # Remove duplicate images by ID if any (due to overlap)
                    unique_images = {img["id"]: img for img in batch_images}.values()
                    
                    print(f"Queuing Multi-modal window starting at Page {batch_pages[0]['page_num']}...")
                    tasks.append(ai_extractor.async_extract_from_text_and_images(batch_text, list(unique_images)))
                
                # Execute all tasks in parallel
                batch_results = await asyncio.gather(*tasks)
                
                for ai_questions in batch_results:
                    if ai_questions:
                        # Deduplicate based on question text similarity (simple check)
                        for q in ai_questions:
                            is_duplicate = False
                            for existing_q in all_ai_questions:
                                if q["question_text"][:50] == existing_q["question_text"][:50]:
                                    is_duplicate = True
                                    break
                            if not is_duplicate:
                                all_ai_questions.append(q)
                
                if all_ai_questions:
                    questions = all_ai_questions
                    extraction_method = "AI (Multi-modal)"

            # Final fallback: Vision-only (if text is still missing or very bad)
            if len(questions) < 1:
                print(f"Triggering Final Vision-based AI Extraction for {file.filename}")
                import fitz
                import base64
                doc = fitz.open(temp_path)
                all_vision_questions = []
                
                tasks = []
                for i in range(0, len(doc), 5):
                    batch_images = []
                    for j in range(i, min(i + 5, len(doc))):
                        pix = doc[j].get_pixmap(matrix=fitz.Matrix(2, 2))
                        img_b64 = base64.b64encode(pix.tobytes("png")).decode('utf-8')
                        batch_images.append({"base64": img_b64, "ext": "png"})
                    
                    print(f"Queuing Vision batch starting at Page {i+1}...")
                    tasks.append(ai_extractor.async_extract_questions_from_images([img["base64"] for img in batch_images]))
                
                # Execute all vision tasks in parallel
                vision_results = await asyncio.gather(*tasks)
                for batch_questions in vision_results:
                    if batch_questions:
                        all_vision_questions.extend(batch_questions)
                
                doc.close()
                if all_vision_questions:
                    questions = all_vision_questions
                    extraction_method = "AI (Vision)"

        return {
            "filename": file.filename, 
            "status": "success",
            "questions_extracted": len(questions),
            "questions": questions,
            "raw_pages": len(extracted_pages),
            "extraction_method": extraction_method
        }
    except Exception as e:
        return {"filename": file.filename, "status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
