from pathlib import Path
from app.services.pdf_service import convert_paginated_pdf_to_images
print("CHECKING pytesseract import and tesseract binary...")
try:
    import pytesseract
    print("pytesseract import: OK")
    try:
        print("pytesseract.tesseract_cmd:", pytesseract.pytesseract.tesseract_cmd)
    except Exception as e:
        print("tesseract_cmd not available:", e)
except Exception as e:
    print("pytesseract import ERROR:", e)

p = Path(r"C:\Users\User\OneDrive\Documents\PDF Document's\diabetes_report.pdf")
print("FILE:", p)
print("EXISTS:", p.exists())

imgs = convert_paginated_pdf_to_images(str(p))
print("rendered images count:", len(imgs))
if imgs:
    img = imgs[0]
    print("first image size/type:", getattr(img, "size", None), type(img))
    try:
        import pytesseract
        sample = pytesseract.image_to_string(img)
        print("OCR sample length:", len(sample))
        print("OCR sample (first 1000 chars):\\n", sample[:1000])
    except Exception as e:
        print("pytesseract OCR error:", e)
