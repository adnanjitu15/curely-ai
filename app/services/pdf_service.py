from pypdf import PdfReader
from PIL import Image
import os
from io import BytesIO
import io

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF files (text-based PDFs). Falls back to OCR for scanned PDFs."""
    try:
        reader = PdfReader(file_path)
        text = ""
        
        # Try standard text extraction first
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text
        
        # If we got meaningful text, return it (Threshold increased to 250 to avoid 116-char metadata trap on scanned PDFs)
        if len(text.strip()) > 250:
            return text.strip()
        
        # If text extraction failed or minimal text, try OCR on each page
        # Convert PDF pages to images and use Gemini Vision API for OCR
        try:
            # Try to use pdf2image if available for better results
            # Use a helper that will try pdf2image (poppler) first and fall back to PyMuPDF
            images = convert_paginated_pdf_to_images(file_path)
            ocr_text = ""

            # For each rendered image try Gemini Vision first; if it returns nothing
            # fall back to pytesseract OCR locally.
            for img in images[:5]:
                try:
                    gv_text = extract_text_from_image_with_gemini_vision(img)
                except Exception:
                    gv_text = ""

                if gv_text and len(gv_text.strip()) > 50:
                    ocr_text += gv_text.strip() + "\n"
                    continue

                # Gemini returned nothing or too short — try local pytesseract
                try:
                    import pytesseract
                    try:
                        pt_text = pytesseract.image_to_string(img)
                        ocr_text += pt_text + "\n"
                    except Exception:
                        pass
                except Exception:
                    # pytesseract not installed or failed; continue
                    pass

            if ocr_text.strip() and len(ocr_text.strip()) > 50:
                return ocr_text.strip()
        except Exception as e:
            print(f"OCR Pipeline Error: {e}")
            pass
            
        # If all extraction methods failed
        return "📄 PDF uploaded (no extractable text found - may be a complex scanned document. Try uploading the text-based version for better results.)"
    
    except Exception as e:
        return f"❌ PDF Error: {str(e)}"


def extract_text_from_image_with_gemini_vision(image: Image.Image) -> str:
    """Use Gemini Vision API to extract text from an image."""
    try:
        import os
        from google import genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return ""
        
        client = genai.Client(api_key=api_key)
        
        # Convert PIL image to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Call Gemini Vision to extract text
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[
                "Extract ALL text from this medical document/report. Return only the text, no explanations.",
                {
                    'inline_data': {
                        'mime_type': 'image/png',
                        'data': img_byte_arr.read()
                    }
                }
            ]
        )
        
        return response.text if response else ""
    except Exception as e:
        print(f"Gemini Vision OCR Error: {e}")
        return ""


def convert_paginated_pdf_to_images(file_path: str) -> list:
    """Convert PDF pages to PIL images using simple method."""
    try:
        from pdf2image import convert_from_path
        return convert_from_path(file_path, first_page=1, last_page=5)
    except Exception:
        # If pdf2image/poppler isn't available, try PyMuPDF (fitz) to render pages
        try:
            import fitz  # PyMuPDF
            images = []
            doc = fitz.open(file_path)
            for page_no in range(min(5, doc.page_count)):
                page = doc.load_page(page_no)
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes()
                img = Image.open(BytesIO(img_bytes))
                images.append(img.convert("RGB"))
            return images
        except Exception:
            return []

def extract_text_from_image(file_path: str) -> str:
    """Handle image files - Use Gemini Vision for OCR."""
    try:
        image = Image.open(file_path)
        size = os.path.getsize(file_path)
        meta = f"🖼️ Image uploaded ({image.format}, {image.size[0]}x{image.size[1]}px, {size/1024:.1f}KB)\n\n"
        
        # Actually perform OCR instead of just returning metadata!
        ocr_text = extract_text_from_image_with_gemini_vision(image)
        if ocr_text.strip():
            return meta + ocr_text.strip()
            
        # Fallback to local tesseract if Gemini fails
        import pytesseract
        pt_text = pytesseract.image_to_string(image)
        if pt_text.strip():
            return meta + pt_text.strip()
            
        return meta + "(No text could be extracted from image)"
    except Exception as e:
        return f"❌ Image Error: {str(e)}"

def extract_text_from_doc(file_path: str) -> str:
    """Extract text from .docx files."""
    try:
        from docx import Document
        doc = Document(file_path)
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        
        if text.strip():
            return text.strip()
        else:
            return "📄 Word document uploaded (no text found)"
    except ImportError:
        return "❌ DOC Error: python-docx not installed. Run: pip install python-docx"
    except Exception as e:
        return f"❌ DOC Error: {str(e)}"

def chunk_text(text: str, chunk_size: int = 700):
    """Splits text into chunks for embeddings."""
    if not text or not text.strip():
        return []
        
    if text.startswith("❌") or text.startswith("⚠️"):
        return [text]  # Don't chunk error messages
    
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
