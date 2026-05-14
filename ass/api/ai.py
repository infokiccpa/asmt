from fastapi import APIRouter, Depends, HTTPException
from core.ai_extractor import AIExtractor
from pydantic import BaseModel
from typing import Optional, List
from api.deps import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])
ai_extractor = AIExtractor()

class GradingRequest(BaseModel):
    question: str
    reference_solution: str
    student_answer: str

class GenerationRequest(BaseModel):
    topic: str
    num_questions: Optional[int] = 5
    difficulty: Optional[str] = "Medium"

@router.post("/grade")
async def grade_answer(request: GradingRequest):
    if not ai_extractor.client:
        raise HTTPException(status_code=503, detail="AI Service disabled (No API Key)")
    
    result = ai_extractor.evaluate_subjective(
        request.question, 
        request.reference_solution, 
        request.student_answer
    )
    return result

@router.post("/generate")
async def generate_questions(request: GenerationRequest):
    if not ai_extractor.client:
        raise HTTPException(status_code=503, detail="AI Service disabled (No API Key)")
    
    questions = ai_extractor.generate_questions(
        request.topic, 
        request.num_questions, 
        request.difficulty
    )
    return questions
