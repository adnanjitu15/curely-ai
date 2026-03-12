from pathlib import Path
p = Path(r"C:\Users\User\OneDrive\Documents\PDF Document's\diabetes_report.pdf")
print("FILE:", p)
print("EXISTS:", p.exists())
from app.services.pdf_service import convert_paginated_pdf_to_images, extract_text_from_pdf
try:
    imgs = convert_paginated_pdf_to_images(str(p))
    print("convert_paginated_pdf_to_images -> images:", len(imgs))
    if imgs:
        img = imgs[0]
        print("first image size/type:", getattr(img, "size", None), type(img))
except Exception:
    import traceback; traceback.print_exc()
print("----- now extract_text_from_pdf -----")
print(extract_text_from_pdf(str(p)))
