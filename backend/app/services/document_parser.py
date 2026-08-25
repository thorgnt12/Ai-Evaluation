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

# Configure Tesseract path if available
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

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
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        # Convert to grayscale for cleaner OCR
        if image.mode != 'L':
            image = image.convert('L')
            
        # Get OCR data including confidence per word
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        words = []
        confidences = []
        
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            conf = float(data['conf'][i])
            if word and conf >= 0:  # pytesseract uses -1 for layout blocks
                words.append(word)
                confidences.append(conf)
                
        extracted_text = " ".join(words)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return extracted_text.strip(), round(avg_confidence, 2)
    except Exception as e:
        # Fallback if tesseract fails
        return f"[OCR Error during image extraction: {str(e)}]", 0.0

def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text from PDF. If digital text is empty, process pages as images for OCR.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text_pages = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_pages.append(page_text.strip())
                
        if text_pages:
            full_text = "\n\n".join(text_pages)
            # Digital PDFs have very high initial text confidence
            return full_text, 98.0
        
        # Scanned PDF without direct text layer
        # Attempt page-by-page OCR extraction if images are embedded
        extracted_chunks = []
        confidences = []
        for page in reader.pages:
            for img_obj in page.images:
                try:
                    img_data = img_obj.data
                    txt, conf = extract_text_from_image(img_data)
                    if txt:
                        extracted_chunks.append(txt)
                        confidences.append(conf)
                except Exception:
                    continue
                    
        if extracted_chunks:
            avg_conf = sum(confidences) / len(confidences) if confidences else 65.0
            return "\n\n".join(extracted_chunks), round(avg_conf, 2)
            
        return "[Scanned PDF detected without direct text layer. OCR quality verification required.]", 50.0
    except Exception as e:
        return f"[PDF Extraction error: {str(e)}]", 0.0

def parse_uploaded_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Unified parser for all accepted document types.
    Returns: { 'text': str, 'confidence': float, 'is_flagged': bool, 'file_type': str }
    """
    ext = Path(filename).suffix.lower()
    
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

    is_flagged = (conf < OCR_CONFIDENCE_THRESHOLD)
    return {
        "text": text,
        "confidence": conf,
        "is_flagged": is_flagged,
        "file_type": file_type,
        "filename": filename
    }
