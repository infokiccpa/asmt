import os
import json
import logging
from typing import List, Dict, Any
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AIExtractor:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("AI_MODEL", "gpt-4o-mini")
        
        if not self.api_key:
            logging.warning("OPENAI_API_KEY not found in environment. AI Extraction will be disabled.")
            self.client = None
            self.async_client = None
        else:
            self.client = OpenAI(api_key=self.api_key)
            self.async_client = AsyncOpenAI(api_key=self.api_key)

    def generate_questions(self, topic: str, num_questions: int = 5, difficulty: str = "Medium") -> List[Dict[str, Any]]:
        """
        Generates brand new questions based on a topic using OpenAI.
        """
        if not self.client:
            return []

        prompt = f"""
        You are an expert educational content creator. Your task is to generate {num_questions} unique questions about '{topic}'.
        The difficulty level should be {difficulty}.
        
        Return the questions in the following JSON format:
        {{
            "questions": [
                {{
                    "question_text": "The full text of the question",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "The full text of the correct option (must match one of the options exactly)",
                    "difficulty": "{difficulty}",
                    "chapter": "{topic}",
                    "step_by_step_solution": "A detailed explanation of how to solve the question"
                }}
            ]
        }}

        Rules:
        1. Ensure the questions are accurate and relevant to the topic.
        2. Always provide 4 options for Multiple Choice Questions.
        3. Infer a clear correct answer.
        4. Provide a helpful step-by-step solution.
        5. Return ONLY the JSON object.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional quiz generator."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            if isinstance(result, dict) and "questions" in result:
                return result["questions"]
            return []
        except Exception as e:
            logging.error(f"AI Generation failed: {str(e)}")
            return []

    def extract_questions_from_images(self, image_b64_list: List[str]) -> List[Dict[str, Any]]:
        """
        Uses OpenAI Vision to extract structured questions from page images.
        """
        if not self.client or not image_b64_list:
            return []

        prompt = """
        You are an expert educational content parser. I am providing you with images of PDF pages that could not be read using traditional OCR.
        Your task is to read the text from these images and extract questions precisely.
        
        Extract each question into the following JSON format:
        {
            "questions": [
                {
                    "question_text": "The full text of the question. Preserve mathematical symbols, formulas (use LaTeX if possible), and logic.",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "The full text of the correct option (must match one of the options exactly).",
                    "difficulty": "Easy, Medium, or Hard",
                    "chapter": "The subject or chapter title if found, otherwise 'General'",
                    "step_by_step_solution": "A detailed explanation of how to solve the question."
                }
            ]
        }

        Rules:
        1. Accuracy is paramount. Reconstruct text from blurry images as best as possible.
        2. Ensure 'correct_answer' exactly matches one of the 'options'.
        3. If no options are visible, return an empty list for 'options'.
        4. Return ONLY the JSON object.
        """

        content = [
            {"type": "text", "text": prompt}
        ]
        
        for b64 in image_b64_list:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{b64}"
                }
            })

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": content}
                ],
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            if isinstance(result, dict) and "questions" in result:
                return result["questions"]
            return []
            
        except Exception as e:
            logging.error(f"AI Vision Extraction failed: {str(e)}")
            return []

    async def async_extract_questions_from_images(self, image_b64_list: List[str]) -> List[Dict[str, Any]]:
        """
        Asynchronously uses OpenAI Vision to extract structured questions from page images.
        """
        if not self.async_client or not image_b64_list:
            return []

        prompt = """
        You are an expert educational content parser. I am providing you with images of PDF pages.
        Your task is to read the text from these images and extract questions precisely.
        
        Extract each question into the following JSON format:
        {
            "questions": [
                {
                    "question_text": "The full text of the question. Preserve mathematical symbols, formulas (use LaTeX if possible), and logic.",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "The full text of the correct option (must match one of the options exactly).",
                    "difficulty": "Easy, Medium, or Hard",
                    "chapter": "The subject or chapter title if found, otherwise 'General'",
                    "step_by_step_solution": "A detailed explanation of how to solve the question."
                }
            ]
        }
        """

        content = [{"type": "text", "text": prompt}]
        for b64 in image_b64_list:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})

        try:
            response = await self.async_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                response_format={ "type": "json_object" }
            )
            result = json.loads(response.choices[0].message.content)
            return result.get("questions", []) if isinstance(result, dict) else []
        except Exception as e:
            logging.error(f"Async AI Vision Extraction failed: {str(e)}")
            return []

    def extract_questions(self, text_content: str) -> List[Dict[str, Any]]:
        """
        Uses OpenAI to extract structured questions from raw OCR text.
        """
        if not self.client:
            return []

        prompt = """
        You are an expert educational content parser. Your task is to extract questions from the provided OCR text.
        The text might contain noise, ligatures, or broken lines.
        
        Extract each question into the following JSON format:
        {
            "questions": [
                {
                    "question_text": "The full text of the question. Preserve formulas and logic.",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "The full text of the correct option (must match one of the options exactly).",
                    "difficulty": "Easy, Medium, or Hard",
                    "chapter": "The subject or chapter title if found, otherwise 'General'",
                    "step_by_step_solution": "A detailed explanation of how to solve the question."
                }
            ]
        }

        Rules for Noise Handling:
        1. Ignore OCR artifacts like page numbers, headers, or footers.
        2. Fix common OCR mistakes: "0" instead of "O", "1" instead of "l", etc.
        3. Reconstruct broken sentences into coherent text.
        4. Look for patterns like "1.", "Q1.", "Question 1" as markers.
        5. Ensure 'correct_answer' exactly matches one of the 'options'.
        6. If it's a True/False question, use ["True", "False"] as options.
        7. If it's a subjective question, leave options as an empty list [].
        8. Return ONLY the JSON object.
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Extract questions from this text:\n\n{text_content}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            # The result might be wrapped in a key like "questions"
            if isinstance(result, dict) and "questions" in result:
                return result["questions"]
            elif isinstance(result, list):
                return result
            return []
            
        except Exception as e:
            logging.error(f"AI Extraction failed: {str(e)}")
            return []

    def extract_from_text_and_images(self, text_content: str, images: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Uses OpenAI Multi-modal (Vision + Text) to extract questions.
        The text_content contains [DIAGRAM_id] placeholders which correspond to images in the images list.
        """
        if not self.client:
            return []

        prompt = """
        You are an expert educational content parser. I am providing you with text extracted from a PDF and associated images/diagrams.
        The text contains placeholders like [DIAGRAM_img_id] where a diagram was located in the original document.
        
        YOUR MISSION:
        1. EXTRACT EVERY SINGLE QUESTION: Do not skip any question found in the text. Look for numbers (1, 2, 3...), question marks, or keywords like "Problem", "Exercise".
        2. USE DIAGRAMS ACTIVELY: Many questions are incomplete without the diagram. If a question refers to a diagram, examine the corresponding image [DIAGRAM_img_id] and include labels, values, or descriptions from the image into the question text.
        3. CAPTURE ALL OPTIONS: Carefully look for options like (a), (b), (c), (d) or A, B, C, D. Ensure they are correctly mapped to the options list.
        4. SOLVE THE QUESTIONS: Provide a detailed step-by-step solution for each question.
        
        Return the results in this JSON format:
        {
            "questions": [
                {
                    "question_text": "The full text of the question. Include the reference [DIAGRAM_img_id] where appropriate. If the question refers to 'the figure', describe what is in the figure if needed for clarity.",
                    "options": ["Option A content", "Option B content", "Option C content", "Option D content"],
                    "correct_answer": "The full content of the correct option (must match one of the options exactly).",
                    "difficulty": "Easy, Medium, or Hard",
                    "chapter": "Subject or topic",
                    "step_by_step_solution": "Detailed explanation."
                }
            ]
        }

        Rules:
        - Use LaTeX for all mathematical expressions (e.g., $E=mc^2$ or \frac{a}{b}).
        - If a question is subjective (no options), return an empty list for "options".
        - Ensure "correct_answer" is an exact string match for one of the items in "options".
        - Return ONLY the JSON object. No other text.
        """

        content = [
            {"type": "text", "text": prompt},
            {"type": "text", "text": f"Here is the extracted text with placeholders:\n\n{text_content}"}
        ]
        
        for img in images:
            content.append({
                "type": "text", 
                "text": f"The following image corresponds to placeholder: [DIAGRAM_{img['id']}]"
            })
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/{img.get('ext', 'png')};base64,{img['base64']}"
                }
            })

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": content}
                ],
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            if isinstance(result, dict) and "questions" in result:
                return result["questions"]
            return []
            
        except Exception as e:
            logging.error(f"Multi-modal AI Extraction failed: {str(e)}")
            return []
    async def async_extract_from_text_and_images(self, text_content: str, images: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Asynchronously uses OpenAI Multi-modal (Vision + Text) to extract questions.
        """
        if not self.async_client:
            return []

        prompt = """
        You are an expert educational content parser. I am providing you with text extracted from a PDF and associated images/diagrams.
        The text contains placeholders like [DIAGRAM_img_id] where a diagram was located in the original document.
        
        YOUR MISSION:
        1. EXTRACT EVERY SINGLE QUESTION: Do not skip any question found in the text.
        2. USE DIAGRAMS ACTIVELY: If a question refers to a diagram, examine the corresponding image [DIAGRAM_img_id] and include relevant info.
        3. CAPTURE ALL OPTIONS: Ensure they are correctly mapped to the options list.
        4. SOLVE THE QUESTIONS: Provide a detailed step-by-step solution for each question.
        
        Return the results in this JSON format:
        {
            "questions": [
                {
                    "question_text": "The full text of the question. Include the reference [DIAGRAM_img_id] where appropriate.",
                    "options": ["Option A content", "Option B content", "Option C content", "Option D content"],
                    "correct_answer": "The full content of the correct option (must match one of the options exactly).",
                    "difficulty": "Easy, Medium, or Hard",
                    "chapter": "Subject or topic",
                    "step_by_step_solution": "Detailed explanation."
                }
            ]
        }
        """

        content = [
            {"type": "text", "text": prompt},
            {"type": "text", "text": f"Here is the extracted text with placeholders:\n\n{text_content}"}
        ]
        
        for img in images:
            content.append({"type": "text", "text": f"Image for: [DIAGRAM_{img['id']}]"})
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/{img.get('ext', 'png')};base64,{img['base64']}"}
            })

        try:
            response = await self.async_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                response_format={ "type": "json_object" }
            )
            result = json.loads(response.choices[0].message.content)
            return result.get("questions", []) if isinstance(result, dict) else []
        except Exception as e:
            logging.error(f"Async Multi-modal AI Extraction failed: {str(e)}")
            return []

    def evaluate_subjective(self, question: str, reference_sol: str, student_answer: str) -> Dict[str, Any]:
        """
        Uses OpenAI to grade a subjective answer.
        """
        if not self.client:
            return {"score": 0, "feedback": "AI evaluation disabled (no API key)."}

        prompt = """
        You are a professional examiner. Grade the following student answer based on the question and reference solution.
        Return a JSON object:
        {
            "score": <float between 0 and 1>,
            "feedback": "Brief constructive feedback for the student"
        }
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Question: {question}\nReference Solution: {reference_sol}\nStudent Answer: {student_answer}"}
                ],
                response_format={ "type": "json_object" }
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logging.error(f"AI Evaluation failed: {str(e)}")
            return {"score": 0, "feedback": "Error during AI evaluation."}
