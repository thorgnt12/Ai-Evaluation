import os
import io
import re
from pathlib import Path
from typing import Tuple, Dict, Any, List
from PIL import Image
import pytesseract
from pypdf import PdfReader
import docx

from ..config import OCR_CONFIDENCE_THRESHOLD, TESSERACT_CMD

# Configure Tesseract path dynamically
def configure_tesseract():
    candidate_paths = [
        TESSERACT_CMD,
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            return p
    return None

configure_tesseract()

def extract_text_from_txt(file_bytes: bytes) -> Tuple[str, float]:
    """Extract text from plain text file with 100% confidence."""
    try:
        text = file_bytes.decode('utf-8')
    except UnicodeDecodeError:
        text = file_bytes.decode('latin-1', errors='ignore')
    return text.strip(), 100.0

def extract_text_from_docx(file_bytes: bytes) -> Tuple[str, float]:
    """Extract text from DOCX file with 100% confidence."""
    doc = docx.Document(io.BytesIO(file_bytes))
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                full_text.append(" | ".join(row_text))
    return "\n\n".join(full_text), 100.0

def extract_text_from_image(file_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text from image using pytesseract and compute average confidence score.
    Preserves line breaks, paragraph structure, and table layout for reliable parsing.
    """
    try:
        configure_tesseract()
        image = Image.open(io.BytesIO(file_bytes))
        # Convert to grayscale for cleaner OCR
        if image.mode != 'L':
            image = image.convert('L')

        # Illumination normalization for scans/photos with gradient shadows
        proc_image = image
        try:
            from PIL import ImageFilter
            import numpy as np
            bg = image.filter(ImageFilter.GaussianBlur(radius=35))
            arr = np.array(image).astype(float)
            bg_arr = np.array(bg).astype(float) + 1e-5
            norm = np.clip((arr / bg_arr) * 250, 0, 255).astype(np.uint8)
            proc_image = Image.fromarray(norm)
        except Exception:
            proc_image = image
            
        # Get OCR confidence data
        data = pytesseract.image_to_data(proc_image, output_type=pytesseract.Output.DICT)
        confidences = []
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            conf = float(data['conf'][i])
            if word and conf >= 0:
                confidences.append(conf)
                
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Extract formatted text with full line breaks and structure preserved
        extracted_text = pytesseract.image_to_string(proc_image)
        if not extracted_text.strip():
            # Fallback if image_to_string returned empty
            words = [data['text'][i].strip() for i in range(len(data['text'])) if data['text'][i].strip()]
            extracted_text = " ".join(words)

        return extracted_text.strip(), round(avg_confidence, 2)
    except Exception as e:
        # Fallback if tesseract fails
        return f"[OCR Error during image extraction: {str(e)}]", 0.0

def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text from PDF. If digital text is empty or sparse, process pages as images for OCR.
    Preserves full line breaks, tables, and question paper layout across all pages.
    """
    try:
        configure_tesseract()
        reader = PdfReader(io.BytesIO(file_bytes))
        text_pages = []
        is_scanned = False
        scanned_confidences = []

        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            # If digital text exists with sufficient length (not just a watermark or blank)
            if len(page_text.strip()) > 50:
                text_pages.append(page_text.strip())
            else:
                # Scanned page without direct digital text layer
                page_imgs_text = []
                for img_obj in page.images:
                    try:
                        txt, conf = extract_text_from_image(img_obj.data)
                        if txt and not txt.startswith("[OCR Error"):
                            page_imgs_text.append(txt)
                            scanned_confidences.append(conf)
                    except Exception:
                        continue
                if page_imgs_text:
                    text_pages.append("\n\n".join(page_imgs_text))
                    is_scanned = True
                elif page_text.strip():
                    text_pages.append(page_text.strip())

        if text_pages:
            full_text = "\n\n".join(text_pages)
            if is_scanned:
                avg_c = sum(scanned_confidences) / len(scanned_confidences) if scanned_confidences else 75.0
                return full_text, round(avg_c, 2)
            return full_text, 98.0
            
        return "[Scanned PDF detected without direct text layer. OCR quality verification required.]", 50.0
    except Exception as e:
        return f"[PDF Extraction error: {str(e)}]", 0.0

def parse_uploaded_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Unified parser for all accepted document types.
    Returns: { 'text': str, 'confidence': float, 'is_flagged': bool, 'file_type': str }
    """
    ext = Path(filename).suffix.lower()

    # 1. Immediate Vision AI fast path for handwritten student examination scripts
    is_qp_or_scheme = any(k in filename.lower() for k in ["question", "qp", "paper", "scheme"])
    if not is_qp_or_scheme and ext in ['.pdf', '.jpg', '.jpeg', '.png']:
        try:
            from .gemini_vision_parser import extract_student_answers_with_vision
            vision_res = extract_student_answers_with_vision(file_bytes, filename)
            if vision_res.get("text") and len(vision_res["text"].strip()) > 100:
                return {
                    "text": vision_res["text"],
                    "confidence": vision_res.get("confidence", 98.0),
                    "is_flagged": False,
                    "file_type": ext.replace(".", "") or "pdf",
                    "filename": filename
                }
        except Exception:
            pass
    
    if ext in ['.txt', '.md']:
        text, conf = extract_text_from_txt(file_bytes)
        file_type = 'txt'
    elif ext in ['.docx']:
        text, conf = extract_text_from_docx(file_bytes)
        file_type = 'docx'
    elif ext in ['.pdf']:
        text, conf = extract_text_from_pdf(file_bytes)
        file_type = 'pdf'
    elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']:
        text, conf = extract_text_from_image(file_bytes)
        file_type = 'image'
    else:
        # Generic text attempt
        text, conf = extract_text_from_txt(file_bytes)
        file_type = 'other'

    # If OCR confidence is low (<70%) or result is garbled/noisy (handwritten scripts),
    # upgrade using Google Lens Vision Document Intelligence AI
    if conf < OCR_CONFIDENCE_THRESHOLD or (ext in ['.pdf', '.jpg', '.jpeg', '.png'] and len(text.strip()) < 100):
        try:
            from .gemini_vision_parser import extract_student_answers_with_vision
            vision_res = extract_student_answers_with_vision(file_bytes, filename)
            if vision_res.get("text") and len(vision_res["text"].strip()) > 100:
                text = vision_res["text"]
                conf = vision_res.get("confidence", 98.0)
        except Exception:
            pass

    is_flagged = False
    return {
        "text": text,
        "confidence": conf,
        "is_flagged": False,
        "file_type": file_type,
        "filename": filename
    }
