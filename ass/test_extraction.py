import json
from core.extractor import PDFExtractor
from core.nlp_parser import QuestionParser

pdf_path = r"c:\Users\malli\Desktop\python a\QUIZ\NEET-BIO_QB.pdf"

extractor = PDFExtractor()
parser = QuestionParser()

print("Extracting text from PDF...")
text_pages = extractor.extract_text(pdf_path)

print("Parsing questions...")
questions = parser.extract_questions(text_pages)

print(f"Total questions extracted: {len(questions)}")

if questions:
    print("\nFirst Question:")
    print(json.dumps(questions[0], indent=2))

problematic = [q for q in questions if len(q.get("options", [])) != 4 or not q.get("correct_answer")]
print(f"\nFound {len(problematic)} problematic questions (Missed 4 options).")
if problematic:
    print("First problematic question payload:")
    print(json.dumps(problematic[0], indent=2))
    
    snippet = problematic[0].get("question_text", "")[:30]
    raw_text = next((p["text"] for p in text_pages if snippet in p["text"]), None)
    print("\n--- RAW TEXT ---")
    print(repr(raw_text))
