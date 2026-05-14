import re
from typing import List, Dict, Any, Optional

class QuestionParser:
    def __init__(self) -> None:
        # We need to aggressively look for boundaries since OCR often crushes lines together
        # Split ONLY on Q1, Q2 inline (safer than splitting on bare numbers inline)
        self.inline_q_boundary = re.compile(r'(?=\bQ\d+[\.\:\)])', re.IGNORECASE)
        # Split on A) B) C) D)
        self.opt_boundary = re.compile(r'(?=\b[A-D][\.\)](?:\s|$))')
        # Split on Solution boundaries
        self.sol_boundary = re.compile(r'(?=\b(?:Answer|Solu.{1,3}on|Explanation|Step\s+1)\s*[:\.])', re.IGNORECASE)

        # Starters for validation
        self.is_line_q_start = re.compile(r'^\s*(?:Q\s*\.?\d+[\.\:\)]|(?<!\d)\d+[\.\:\)](?!\d))', re.IGNORECASE)
        self.is_inline_q_start = re.compile(r'^\s*Q\s*\.?\d+[\.\:\)]', re.IGNORECASE)
        self.is_opt_start = re.compile(r'^\s*[A-D][\.\)](?:\s|$)')
        self.is_sol_start = re.compile(r'^\s*(?:Answer|Ans|Solu.{1,3}on|Explanation|Step\s+1|Key|Correct)\s*[:\.]', re.IGNORECASE)
        
        # Chapter header detection
        self.chapter_header = re.compile(r'^\s*(?:Part|Chapter|Unit|Topic|Section)\s+[\w\d]+', re.IGNORECASE)
        
    def _clean_ligatures(self, text: str) -> str:
        """Removes weird OCR ligatures and cleans math symbols."""
        replacements = {
            'Ɵ': 'ti', 'Ʃ': 'St', 'ﬂ': 'fl', 'ﬁ': 'fi', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 
            'Σ': 'Sigma', 'π': 'pi', 'φ': 'ph', 'μ': 'mu', 'Ʃ': 'St',
            'Ɵ': 'ti', 'Ɛ': 'E', 'τ': 't', 'ρ': 'p', 'ω': 'w', 'δ': 'd',
            'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u',
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)
        return self._fix_math_symbols(text)

    def _fix_math_symbols(self, text: str) -> str:
        """Translates garbled math blocks to KaTeX format."""
        text = re.sub(r'([A-Za-z])(?:[ \u00a0\ufffd\uf020\u25a0-\u25ff\ue000-\uf8ff])*(?:[\u20d7\u2192\u20ef\u20d1\u20d0\u20d6])', r'$\\overrightarrow{\1}$', text)
        hat_map = {
            '\u00ee': '$\\hat{i}$', '\u0135': '$\\hat{j}$', 'k\u0302': '$\\hat{k}$',
            'k\u00ca': '$\\hat{k}$', 'k\u02c6': '$\\hat{k}$',
        }
        for bad, good in hat_map.items():
            text = text.replace(bad, good)
            
        text = re.sub(r'([ijk])(?:[ \u00a0\ufffd\uf020\u25a0-\u25ff\ue000-\uf8ff])*[\u0302\u02c6\u005e]', r'$\\hat{\1}$', text)
        text = re.sub(r'([A-Zabcrvxyz])(?:[ \u00a0]*[\ufffd\uf020\u25a0-\u25ff\ue000-\uf8ff]+[ \u00a0]*)+(?==|\+|\-|\s)', r'$\\overrightarrow{\1}$ ', text)
        text = re.sub(r'([A-Zabcrvxyz])(?:[\s\u200b\u00a0]*)[\[\uFF3B](?:[\s\u200b\u00a0]*)[\]\uFF3D]', r'$\\overrightarrow{\1}$', text)
        text = re.sub(r'([A-Zabcrvxyz])(?:[\s\u200b]*)(?:\u25af|\u25a1|\ufffd)(?:[\s\u200b]*)', r'$\\overrightarrow{\1}$ ', text)

        return text

    def _create_new_question(self, index: int, page_num: int, current_chapter: str = "General") -> Dict[str, Any]:
        """Initializes a new blank extracted question object."""
        return {
            "id": f"q_{index}",
            "question_text": "",
            "chapter": current_chapter,
            "difficulty": "Medium",
            "page": page_num,
            "has_diagram": False,
            "image_base64": None,
            "options": [],
            "solution_text": "",
            "correct_answer": None,
            "step_by_step_solution": None,
            "state": "question"
        }

    def _process_state_chunks(self, current_q: Dict[str, Any], q_chunk: str) -> None:
        """Routes text chunks into the correct part of the question state."""
        sol_chunks = self.sol_boundary.split(q_chunk)
        for sol_chunk in sol_chunks:
            sol_chunk = sol_chunk.strip()
            if not sol_chunk: continue
            
            if self.is_sol_start.match(sol_chunk):
                current_q["state"] = "solution"
                current_q["solution_text"] += " " + sol_chunk
            elif current_q["state"] == "solution":
                current_q["solution_text"] += " " + sol_chunk
            else:
                self._process_options(current_q, sol_chunk)

    def _process_options(self, current_q: Dict[str, Any], sol_chunk: str) -> None:
        """Parses individual options (A, B, C, D)."""
        opt_chunks = self.opt_boundary.split(sol_chunk)
        for opt_chunk in opt_chunks:
            opt_chunk = opt_chunk.strip()
            if not opt_chunk: continue
            
            if self.is_opt_start.match(opt_chunk):
                current_q["state"] = "options"
                current_q["options"].append(opt_chunk)
            elif current_q["state"] == "options":
                if len(current_q["options"]) > 0:
                    current_q["options"][-1] += " " + opt_chunk
                else:
                    current_q["options"].append(opt_chunk)
            else:
                current_q["question_text"] += " " + opt_chunk

    def extract_questions(self, text_pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Main parsing loop over logical text chunks from OCR pages."""
        questions: List[Dict[str, Any]] = []
        global_q_index = 1
        current_q: Optional[Dict[str, Any]] = None
        pending_img_b64: Optional[str] = None
        current_chapter = "General"
        
        for page in text_pages:
            raw_text = self._clean_ligatures(page.get("text", ""))
            page_images = {img["id"]: img for img in page.get("images", [])}
            
            lines = raw_text.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line: continue
                
                # Check for chapter headers (short line, no question mark)
                if self.chapter_header.match(line) and len(line) < 100 and not line.endswith('?'):
                    current_chapter = line
                    continue
                
                diagram_match = re.search(r'\[DIAGRAM_(img_\d+_\d+)\]', line)
                if diagram_match:
                    img_id = diagram_match.group(1)
                    if img_id in page_images:
                        pending_img_b64 = page_images[img_id]["base64"]
                    line = line.replace(diagram_match.group(0), " ").strip()
                    if not line and not pending_img_b64: continue

                q_chunks = self.inline_q_boundary.split(line)
                for i, q_chunk in enumerate(q_chunks):
                    q_chunk = q_chunk.strip()
                    
                    if not q_chunk and pending_img_b64 and current_q:
                        current_q["has_diagram"] = True
                        current_q["image_base64"] = pending_img_b64
                        pending_img_b64 = None
                        continue
                        
                    if not q_chunk: continue
                    
                    is_new_q = False
                    if self.is_inline_q_start.match(q_chunk):
                        is_new_q = True
                    elif i == 0 and self.is_line_q_start.match(q_chunk):
                        is_new_q = True
                        
                    if is_new_q:
                        if current_q:
                            self._finalize_question(current_q)
                            questions.append(current_q)
                        
                        current_q = self._create_new_question(global_q_index, page.get("page_num", 1), current_chapter)
                        global_q_index += 1
                        
                        if pending_img_b64:
                            current_q["has_diagram"] = True
                            current_q["image_base64"] = pending_img_b64
                            pending_img_b64 = None
                            
                    elif current_q and pending_img_b64:
                        current_q["has_diagram"] = True
                        current_q["image_base64"] = pending_img_b64
                        pending_img_b64 = None
                    
                    if current_q:
                        self._process_state_chunks(current_q, q_chunk)
                                    
        if current_q:
            self._finalize_question(current_q)
            questions.append(current_q)
            
        return questions

    def _format_as_steps(self, text: str) -> str:
        """Formats unstructured logic strings into step-by-step reasoning."""
        if not text: return ""
        if 'Step 1' in text or 'Step 2' in text: return text
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        if len(sentences) <= 1: return f"Logic applied: {text}"
        formatted = ""
        for i, sentence in enumerate(sentences, 1):
            formatted += f"Step {i}: {sentence}\n"
        return formatted.strip()

    def _infer_difficulty(self, q: Dict[str, Any]) -> str:
        """Applies heuristics to guess difficulty level based on length & structure."""
        text = q.get("question_text", "")
        sol = q.get("step_by_step_solution", "")
        opts = "".join(q.get("options", []))
        
        # Hard: Multi-line text, complex solutions, or heavy options
        if len(text) > 180 or len(sol) > 300 or len(opts) > 200:
            return "Hard"
        # Easy: Short one-liners
        elif len(text) < 80 and len(sol) < 100 and len(opts) < 80:
            return "Easy"
        
        return "Medium"

    def _finalize_question(self, q: Dict[str, Any]) -> None:
        """Cleans white spaces and finalizes state tags."""
        q["question_text"] = re.sub(r'\s+', ' ', q.get("question_text", "")).strip()
        clean_opts = [re.sub(r'\s+', ' ', opt.strip()) for opt in q["options"]]
            
        sol_text = q.get("solution_text", "").strip()
        
        # Look for Answer: A or Ans: (A) or Answer is B
        ans_patterns = [
            r'(?:Answer|Ans|Key)\s*[:\-]?\s*([A-D])(?:\b|\.|\)|\|)', 
            r'(?:Correct|Choice)\s+(?:is|Option)\s*([A-D])(?:\b|\.|\)|\|)',
            r'^([A-D])\s*$',  # Just the letter
        ]
        
        ans_letter = None
        remaining_sol = sol_text
        
        for pattern in ans_patterns:
            match = re.search(pattern, sol_text, re.IGNORECASE)
            if match:
                ans_letter = match.group(1).upper()
                # If we found it via a complex pattern, try to get the rest as solution
                if len(match.groups()) > 1:
                     remaining_sol = match.group(2)
                else:
                    # Strip the answer part from the start if it matches
                    remaining_sol = re.sub(pattern, '', sol_text, flags=re.IGNORECASE).strip()
                break
        
        if ans_letter:
            q["step_by_step_solution"] = self._format_as_steps(remaining_sol)
            for opt in clean_opts:
                # Direct match: "A) Text"
                if opt.upper().startswith(f"{ans_letter})") or opt.upper().startswith(f"{ans_letter}."):
                    q["correct_answer"] = opt
                    break
            if not q.get("correct_answer"):
                # Fallback: if we found 'A' but options are just ["Red", "Blue", ...], map A to 0, B to 1
                idx = ord(ans_letter) - ord('A')
                if 0 <= idx < len(clean_opts):
                    q["correct_answer"] = clean_opts[idx]
        else:
            q["step_by_step_solution"] = self._format_as_steps(sol_text)
                
        if not clean_opts: clean_opts = ["Option A", "Option B", "Option C", "Option D"]
        q["options"] = clean_opts[:4]
        
        if not q.get("correct_answer") and q["options"]:
            q["correct_answer"] = q["options"][0]
            
        q["difficulty"] = self._infer_difficulty(q)
            
        if "state" in q: del q["state"]