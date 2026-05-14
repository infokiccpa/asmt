import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import base64

class PDFExtractor:
    def __init__(self, tesseract_cmd=None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def is_page_image_based(self, page) -> bool:
        """Heuristic to determine if a page is purely an image/scanned document."""
        text = page.get_text("text").strip()
        # If very little text but has large images, consider it image-based
        if len(text) < 50 and len(page.get_images()) > 0:
            return True
        return False

    def extract_text(self, pdf_path: str):
        doc = fitz.open(pdf_path)
        extracted_pages = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            if self.is_page_image_based(page):
                text = self._ocr_page(page)
                source_type = "image_ocr"
                images = self._extract_images_from_page(doc, page)
            else:
                source_type = "text_pdf"
                text, images = self._extract_text_and_images(page, page_num)
            
            extracted_pages.append({
                "page_num": page_num + 1,
                "text": text,
                "source_type": source_type,
                "images_count": len(images),
                "images": images
            })
            
        doc.close()
        return extracted_pages

    def _extract_text_and_images(self, page, page_num):
        page_dict = page.get_text("dict", sort=True)
        text_lines = []
        extracted_images = []
        
        # Get all image info on the page to catch "floating" images
        page_images = page.get_image_info(hashes=True)
        # Filter out very small images (like icons or tiny artifacts)
        page_images = [img for img in page_images if (img["bbox"][2] - img["bbox"][0]) > 20 and (img["bbox"][3] - img["bbox"][1]) > 20]
        
        # Symbol Mappings
        SUPERSCRIPTS = str.maketrans("0123456789+-=()abcdefghijklmnoprstuvwxyz", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₌⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ")
        SUBSCRIPTS = str.maketrans("0123456789+-=()aehiox", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢₒₓ")
        GREEK_MAP = {"alpha": "α", "beta": "β", "gamma": "γ", "delta": "Δ", "theta": "θ", "lambda": "λ", "mu": "μ", "pi": "π", "rho": "ρ", "sigma": "σ", "tau": "τ", "phi": "φ", "omega": "ω", "Delta": "Δ", "Omega": "Ω", "degree": "°"}
        
        # Create elements list
        all_elements = []
        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:  # text
                all_elements.append({"type": "text", "bbox": block["bbox"], "data": block})
            elif block.get("type") == 1: # image block
                all_elements.append({"type": "image", "bbox": block["bbox"], "data": block})

        # Add missing images
        for img_info in page_images:
            bbox = img_info["bbox"]
            is_covered = False
            for el in all_elements:
                if el["type"] == "image":
                    eb = el["bbox"]
                    if (bbox[0] >= eb[0]-5 and bbox[1] >= eb[1]-5 and bbox[2] <= eb[2]+5 and bbox[3] <= eb[3]+5):
                        is_covered = True
                        break
            if not is_covered:
                all_elements.append({"type": "image", "bbox": bbox, "data": img_info})

        # Sort by Y, then X
        all_elements.sort(key=lambda e: (e["bbox"][1], e["bbox"][0]))

        for el in all_elements:
            if el["type"] == "text":
                block = el["data"]
                for line in block.get("lines", []):
                    spans = sorted(line.get("spans", []), key=lambda s: s.get("origin", (0,0))[0])
                    if not spans: continue
                    
                    sizes = [float(s.get("size", 10.0)) for s in spans]
                    dominant_size = float(max(sizes, key=sizes.count) if sizes else 10.0)
                    baseline_y = spans[0].get("origin", (0,0))[1]
                    for s in spans:
                        if s.get("size", 10.0) >= dominant_size * 0.95:
                            baseline_y = s.get("origin", (0,0))[1]
                            break

                    line_text = ""
                    for span in spans:
                        text = span.get("text", "")
                        size = float(span.get("size", dominant_size))
                        origin_y = float(span.get("origin", (0,0))[1])
                        is_super_flag = (span.get("flags", 0) & 1) != 0
                        is_super = False
                        is_sub = False
                        if size < dominant_size * 0.88 or is_super_flag:
                            y_offset = baseline_y - origin_y
                            if y_offset > dominant_size * 0.15 or is_super_flag:
                                is_super = True
                            elif y_offset < -(dominant_size * 0.05):
                                is_sub = True
                        if is_super: text = text.translate(SUPERSCRIPTS)
                        elif is_sub: text = text.translate(SUBSCRIPTS)
                        for name, char in GREEK_MAP.items():
                            if name in text: text = text.replace(name, char)
                        line_text += text
                    text_lines.append(line_text + "\n")
                    
            elif el["type"] == "image":
                bbox = el["bbox"]
                try:
                    mat = fitz.Matrix(2, 2)
                    pix = page.get_pixmap(matrix=mat, clip=bbox)
                    img_bytes = pix.tobytes("png")
                    img_id = f"img_{page_num}_{len(extracted_images)}"
                    extracted_images.append({
                        "id": img_id,
                        "base64": base64.b64encode(img_bytes).decode('utf-8'),
                        "ext": "png"
                    })
                    text_lines.append(f"\n[DIAGRAM_{img_id}]\n")
                except Exception:
                    pass

        return "".join(text_lines), extracted_images

    def _ocr_page(self, page) -> str:
        """Convert page to raw image and perform OCR using Tesseract."""
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # 2x zoom for better OCR
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            return f"[OCR Engine Error or Missing - {str(e)}]"

    def _extract_images_from_page(self, doc, page) -> list:
        img_info = []
        image_list = page.get_images(full=True)
        for img_index, img in enumerate(image_list, start=1):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            img_b64 = base64.b64encode(image_bytes).decode('utf-8')
            img_info.append({
                "id": f"img_ocr_{xref}",
                "xref": xref,
                "ext": ext,
                "base64": img_b64
            })
        return img_info
    
