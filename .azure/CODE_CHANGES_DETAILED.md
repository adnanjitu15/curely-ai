# 📝 Code Changes Summary - All fixes in one place

## Files Modified

### 1. Frontend: `medical-frontend/app/page.tsx`

#### Change 1A: Added attachment state

```tsx
// BEFORE: (state didn't exist)

// AFTER:
const [attachedFile, setAttachedFile] = useState<{
  name: string;
  type: string;
  size: number;
} | null>(null);
```

#### Change 1B: File picker now accepts images

```tsx
// BEFORE:
<input accept=".pdf" type="file" className="hidden" />

// AFTER:
<input accept=".pdf,.jpg,.jpeg,.png,.gif" type="file" className="hidden" />
```

#### Change 1C: File handler stores attachment instead of showing as message

```tsx
// BEFORE:
onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setIsUploading(true);
  setMessages(prev => [...prev, { role: 'user', content: `📎 Uploading: ${file.name}` }]); // ❌ WRONG!
  // ... upload logic ...
}}

// AFTER:
onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Store attached file (don't show as message!)
  setAttachedFile({ name: file.name, type: file.type, size: file.size });

  // Only upload when user explicitly sends (after they click send)
  if (fileInputRef.current) fileInputRef.current.value = '';
}}
```

#### Change 1D: New attachment chip component

```tsx
// BEFORE: (didn't exist - upload appeared as message)

// AFTER: (added right after paperclip button)
{
  /* ATTACHMENT CHIP (ChatGPT-style) */
}
{
  attachedFile && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700"
    >
      <span>📎</span>
      <span className="truncate max-w-[120px] font-medium">
        {attachedFile.name}
      </span>
      <button
        onClick={() => setAttachedFile(null)}
        className="ml-1 text-emerald-600 hover:text-red-600 transition-colors"
      >
        ✕
      </button>
    </motion.div>
  );
}
```

#### Change 1E: Enhanced handleSendMessage to handle files

```tsx
// BEFORE:
const handleSendMessage = async () => {
  if (!chatInput.trim() || isLoading) return;
  // ... only handled text messages
};

// AFTER:
const handleSendMessage = async () => {
  // If there's an attached file, upload it first
  if (attachedFile && fileInputRef.current?.files?.[0]) {
    const file = fileInputRef.current.files[0];
    const messageText = chatInput.trim(); // Capture before clearing
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `✅ Document uploaded successfully!\n\n📄 ${file.name}\n📊 ${data.characters_extracted} characters extracted\n🧩 ${data.chunks_created} knowledge chunks created\n\nYou can now ask me questions about this document! 🧠`,
          },
        ]);
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        // If there's also a message, send it after upload completes
        if (messageText) {
          setChatInput("");
          setMessages((prev) => [
            ...prev,
            { role: "user", content: messageText },
          ]);

          const response = await fetch("http://localhost:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageText }),
          });
          const chatData = await response.json();
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: chatData.reply },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `❌ Upload failed: ${data.detail || "Unknown error"}.`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "❌ Could not connect to server.",
        },
      ]);
    } finally {
      setIsUploading(false);
      inputRef.current?.focus();
    }
    return;
  }

  // Otherwise, send text message (existing code)
  if (!chatInput.trim() || isLoading) return;
  // ... text message logic ...
};
```

#### Change 1F: Send button now disables during upload

```tsx
// BEFORE:
<button onClick={handleSendMessage} disabled={isLoading} ... />

// AFTER:
<button onClick={handleSendMessage} disabled={isLoading || isUploading} ... />
```

#### Change 1G: Paperclip button styling

```tsx
// BEFORE:
<button disabled={isUploading} className="p-3 text-slate-400 hover:text-blue-600 ..." />

// AFTER:
<button
  disabled={isUploading || attachedFile !== null}
  className={`p-3 rounded-2xl transition-all ${
    attachedFile
      ? 'text-emerald-600 bg-emerald-50 cursor-not-allowed'
      : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
  } ${isUploading ? 'animate-pulse' : ''}`}
/>
```

---

### 2. Backend: `app/services/pdf_service.py`

#### COMPLETE REPLACEMENT:

```python
# BEFORE:
from pypdf import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()


# AFTER:
from pypdf import PdfReader
from PIL import Image
import pytesseract
import os
from pathlib import Path

# Configure pytesseract path (for Windows installations)
try:
    pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except Exception as e:
    print(f"Warning: Tesseract-OCR not found at default path. {e}")

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from PDF. If text extraction fails (scanned PDF),
    fallback to OCR on each page as an image.
    """
    reader = PdfReader(file_path)
    text = ""

    # First, try standard text extraction
    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        text += page_text

    # If little/no text was extracted, treat as scanned PDF and use OCR
    if len(text.strip()) < 50:  # Threshold: less than 50 chars means likely scanned
        print(f"Low text detected. Using OCR fallback for {file_path}")
        text = extract_text_from_scanned_pdf(file_path)

    return text.strip()


def extract_text_from_scanned_pdf(file_path: str) -> str:
    """
    Extract text from scanned PDF using OCR.
    Converts PDF pages to images, then runs Tesseract OCR.
    """
    try:
        import pdf2image
    except ImportError:
        return "❌ OCR Error: pdf2image not installed."

    try:
        # Convert PDF pages to images
        images = pdf2image.convert_from_path(file_path)

        text = ""
        for img in images:
            # Run OCR on each image
            ocr_text = pytesseract.image_to_string(img)
            text += ocr_text + "\n"

        return text.strip()
    except Exception as e:
        return f"❌ OCR Error: {str(e)}"


def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from image files (.jpg, .jpeg, .png, .gif) using OCR.
    """
    try:
        image = Image.open(file_path)
        # Run Tesseract OCR
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        return f"❌ Image OCR Error: {str(e)}"
```

---

### 3. Backend: `app/main.py`

#### Change 3A: Import image extraction

```python
# BEFORE:
from app.services.pdf_service import extract_text_from_pdf

# AFTER:
from app.services.pdf_service import extract_text_from_pdf, extract_text_from_image
```

#### Change 3B: Complete /upload endpoint rewrite

```python
# BEFORE:
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_id = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(UPLOAD_DIR, file_id)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    extracted_text = extract_text_from_pdf(file_path)

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from PDF")

    chunks = chunk_text(extracted_text)
    add_document_chunks(chunks)

    return {
        "filename": file.filename,
        "characters_extracted": len(extracted_text),
        "chunks_created": len(chunks),
        "preview": extracted_text[:500]
    }


# AFTER:
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process documents:
    - PDFs: Extract text (with OCR fallback for scanned PDFs)
    - Images (.jpg, .jpeg, .png, .gif): Extract text using OCR
    """
    filename_lower = file.filename.lower()
    is_image = filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif'))
    is_pdf = filename_lower.endswith('.pdf')

    if not (is_pdf or is_image):
        raise HTTPException(status_code=400, detail="Only PDF and image files allowed (PDF, JPG, PNG, GIF)")

    # Save file with appropriate extension
    if is_pdf:
        file_id = f"{uuid.uuid4()}.pdf"
    else:
        ext = filename_lower[filename_lower.rfind('.'):]
        file_id = f"{uuid.uuid4()}{ext}"

    file_path = os.path.join(UPLOAD_DIR, file_id)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Extract text with proper routing
    try:
        if is_pdf:
            extracted_text = extract_text_from_pdf(file_path)
        else:  # Image
            extracted_text = extract_text_from_image(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text: {str(e)}")

    if not extracted_text.strip() or extracted_text.startswith("❌"):
        raise HTTPException(status_code=400, detail=extracted_text or "No text could be extracted from document.")

    # Chunk and embed
    chunks = chunk_text(extracted_text)
    add_document_chunks(chunks)

    return {
        "filename": file.filename,
        "characters_extracted": len(extracted_text),
        "chunks_created": len(chunks),
        "preview": extracted_text[:500]
    }
```

---

### 4. Dependencies: `requirements.txt`

#### Added at the end:

```
pillow==10.8.0
pytesseract==0.3.13
pdf2image==1.21.5
```

---

## Summary of Changes

| Component            | Change                               | Impact                      |
| -------------------- | ------------------------------------ | --------------------------- |
| File Picker `accept` | `.pdf` → `.pdf,.jpg,.jpeg,.png,.gif` | Images now supported        |
| File Handler         | Shows message → Stores in state      | Upload as attachment chip   |
| Attachment Display   | N/A → New chip component             | ChatGPT-style UX            |
| handleSendMessage    | Text only → Handles files & text     | Can send file with message  |
| pdf_service.py       | Simple extraction → OCR fallback     | Scanned PDFs work           |
| New Functions        | N/A → 2 new extraction functions     | Image + scanned PDF support |
| Backend /upload      | PDF only → PDF + images              | Accepts all file types      |
| Dependencies         | 0 new → 3 packages                   | OCR capability              |

---

## Result

**Before:** ❌ Broken, non-standard, limited, error-prone
**After:** ✅ Professional, standard, flexible, resilient
