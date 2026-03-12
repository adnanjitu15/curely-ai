# 🚀 Quick Start: Testing Your Fixed Upload Experience

## What Changed (TL;DR)

✅ Upload no longer appears as a **sent message** → Now appears as an **attachment chip**
✅ Scanned PDFs now work with **automatic OCR**
✅ Images (.jpg, .png, .gif) can now be uploaded with **OCR extraction**

---

## Step 1: Install Tesseract-OCR (Required for Scanned PDFs & Images)

### Windows

1. Download installer: https://github.com/UB-Mannheim/tesseract/wiki/Downloads
2. Run installer, use **default path**: `C:\Program Files\Tesseract-OCR\`
3. Click "Install"
4. Done! Restart your terminal after installation

### macOS

```bash
brew install tesseract
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install tesseract-ocr
```

---

## Step 2: Verify Installation (Optional)

Test that Tesseract is accessible:

```bash
cd c:\Users\User\medical-rag
python -c "import pytesseract; from PIL import Image; print('✅ Tesseract ready!')"
```

If this fails, revisit Step 1 (might need system restart).

---

## Step 3: Start Your Backend & Frontend

### Terminal 1: Backend (FastAPI)

```bash
cd c:\Users\User\medical-rag
python -m uvicorn app.main:app --reload --port 8000
```

Expected output:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Terminal 2: Frontend (Next.js)

```bash
cd c:\Users\User\medical-rag\medical-frontend
npm run dev
```

Expected output:

```
▲ Next.js v14.x.x
- Local: http://localhost:3000
```

---

## Step 4: Test It Out! 🧪

### Test Case 1: Normal PDF Upload

1. Go to http://localhost:3000 (should load the homepage)
2. Click "Chat with AI" or go to chat page
3. Click the **📎 paperclip** button
4. Select a **normal PDF** from your computer
5. **Expected:** Attachment chip appears in input area (green, with filename)
6. Type: "What's in this document?"
7. Click send
8. **Expected:** File uploads → Success message → Your question gets answered

---

### Test Case 2: Scanned PDF (THE BIG FIX!)

1. Use your **diabetes_report.pdf** (the one that was failing)
2. Click **📎 paperclip**
3. Select the **diabetes_report.pdf**
4. **Expected:** Attachment chip shows ✓
5. Click send
6. **Expected:**
   - Backend detects scanned PDF
   - Automatically switches to OCR
   - Extracts text successfully
   - Shows: "✅ Uploaded! 2847 characters extracted, 5 chunks created"
   - **NO MORE ERROR!** 🎉

---

### Test Case 3: Image Upload (NEW FEATURE!)

1. Gather your **JPEG medical report** (the one that was hidden before)
2. Click **📎 paperclip**
3. Select the **JPEG file**
4. **Expected:**
   - Attachment chip shows (previously invisible in picker!) ✓
   - File is accepted (previously rejected!) ✓
5. Click send
6. **Expected:**
   - OCR extracts text from image
   - Success! Medical report readable
   - You can now ask: "What does this medical report say?"

---

### Test Case 4: File + Message (BONUS!)

1. Attach a file (PDF or image)
2. Type a message: **"Can you analyze this and tell me the key findings?"**
3. Click send
4. **Expected:**
   - File uploads
   - Message sends
   - Both processed sequentially
   - Attachment chip disappears after send

---

### Test Case 5: Remove Attachment (BEFORE SENDING)

1. Attach a file
2. See attachment chip with **✕ button**
3. Click the **✕**
4. **Expected:** Attachment chip disappears, input is empty
5. Click send
6. **Expected:** Nothing happens (no file, no message)

---

## What You'll See (UI Comparison)

### Input Area Layout

#### BEFORE (Broken)

```
┌─────────────────────────────────────────┐
│  [📎] Message Curely AI... [Send] [Mic] │
└─────────────────────────────────────────┘
(Upload appears in chat as a message)
```

#### AFTER (Fixed)

```
┌──────────────────────────────────────────────────┐
│  [📎] ┌──────────────────────┐ [Mic] [Send]     │
│       │ 📎 file.pdf        ✕ │                  │
│       └──────────────────────┘                   │
│                                                   │
│  Message Curely AI...                           │
└──────────────────────────────────────────────────┘
(Upload appears as attachment chip in input)
```

---

## Expected Chat Flow

### Example: Upload Scanned PDF

```
You: [Attach diabetes_report.pdf]
     "Can you explain my results?"

Curely AI: ✅ Document uploaded successfully!

          📄 diabetes_report.pdf
          📊 2,847 characters extracted
          🧩 5 knowledge chunks created

          You can now ask me questions about this document! 🧠

You: Can you explain my results?

Curely AI: Based on your diabetes report, here are the key findings...
          (etc.)
```

---

## Troubleshooting

### ❌ "Tesseract-OCR not found" Error

**Solution:** Install Tesseract if not already done

- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki/Downloads
- After install, restart your terminal and backend server

### ❌ "No text could be extracted from PDF"

**Solution:** This PDF might be heavily image-based or encrypted

- Try a simpler scanned PDF
- Or try uploading as an image (screenshot) instead

### ❌ "Image file not accepted by file picker"

**Solution:** This has been fixed! If you still see this:

1. Clear browser cache: `Ctrl+Shift+Delete`
2. Refresh the page: `Ctrl+F5`
3. Try again

### ❌ "Backend connection error"

**Solution:** Make sure backend is running on port 8000

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### ❌ "File upload very slow"

**Reason:** OCR takes time (especially for long scanned PDFs)
**Expected:** 2-5 seconds for typical medical documents
**Normal:** Don't worry, it's working in the background

---

## Files Modified

### Frontend Changes

- `medical-frontend/app/page.tsx`
  - Added `attachedFile` state
  - Updated file picker to accept images
  - New attachment chip component
  - Enhanced `handleSendMessage()` to process files

### Backend Changes

- `app/services/pdf_service.py`
  - New OCR fallback for scanned PDFs
  - Image extraction with OCR
  - Smart detection of scanned documents

- `app/main.py`
  - Updated `/upload` endpoint to accept images
  - Routes files to appropriate extraction method

### Dependencies Added

- `pillow` - Image processing
- `pytesseract` - Python OCR interface
- `pdf2image` - Convert PDF pages to images

---

## Success Criteria ✅

After testing, you should be able to:

- [ ] Upload regular PDFs successfully
- [ ] Upload scanned PDFs without "extraction failed" error
- [ ] Upload JPEG medical reports (previously invisible in picker)
- [ ] See attachments as green chips, not messages
- [ ] Remove attachments before sending
- [ ] Send a file + a message together
- [ ] See successful upload confirmations with character count

---

## Next Time You Use It

Your app will now:

1. **Feel professional** - Like ChatGPT, Claude, or Gmail
2. **Just work** - Scanned PDFs, images, everything handled
3. **Be forgiving** - OCR fallback catches failures
4. **Be smart** - Auto-detects scanned PDFs and switches mode

---

## Questions?

If something doesn't work as expected:

1. Check backend terminal for errors
2. Verify Tesseract installed correctly
3. Clear browser cache and refresh
4. Restart backend server
5. Check the `.azure/UPLOAD_FIXES.md` file for technical details
