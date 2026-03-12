from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid

from app.core.schemas import ChatRequest, ChatResponse
from app.services.pdf_service import extract_text_from_pdf, extract_text_from_image, extract_text_from_doc, chunk_text
from app.services.chat_service import generate_chat_reply, generate_chat_reply_with_context
from app.services.vector_store import add_document_chunks, semantic_search

# --- ORIGINAL CODE (Backed up for safety) ---
# app = FastAPI(
#     title="Medical RAG Backend",
#     description="Medical chatbot with document understanding",
#     version="0.3.0"
# )
# --------------------------------------------

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Medical RAG Backend",
    description="Medical chatbot with document understanding",
    version="0.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- CONFIG ----------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------- BASIC ENDPOINTS ----------------

@app.get("/")
def root():
    return {"status": "Medical RAG API running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ---------------- CHAT ----------------

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Get the user message
    message = request.message.lower()
    
    # 1️⃣ Semantic search over embedded document chunks (if available)
    docs = semantic_search(request.message)
    doc_context = None
    if docs:
        doc_context = docs[0]  # Get the most relevant chunk

    # 2️⃣ Generate reply with document context if available
    if doc_context:
        # If we have document context, include it in the prompt for better analysis
        enhanced_message = f"{request.message}\n\n[Document Context: {doc_context}]"
        base_reply = generate_chat_reply_with_context(enhanced_message, doc_context)
    else:
        base_reply = generate_chat_reply(request.message)

    return ChatResponse(reply=base_reply)

# ---------------- FILE UPLOAD ----------------

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process documents:
    - PDFs: Extract text from text-based PDFs
    - Images (.jpg, .jpeg, .png, .gif): Store as-is (metadata returned)
    - Word (.docx): Extract text from paragraphs
    """
    filename_lower = file.filename.lower()
    is_image = filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif'))
    is_pdf = filename_lower.endswith('.pdf')
    is_doc = filename_lower.endswith(('.docx', '.doc'))
    
    if not (is_pdf or is_image or is_doc):
        raise HTTPException(status_code=400, detail="Only PDF, DOC/DOCX, and image files allowed (PDF, DOCX, JPG, PNG, GIF)")

    # 1️⃣ Save file
    ext = filename_lower[filename_lower.rfind('.'):]
    file_id = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, file_id)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # 2️⃣ Extract content based on file type
    try:
        if is_pdf:
            extracted_text = extract_text_from_pdf(file_path)
        elif is_doc:
            extracted_text = extract_text_from_doc(file_path)
        else:  # Image
            extracted_text = extract_text_from_image(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

    # 3️⃣ Allow warnings (messages starting with 🖼️, 📄, ⚠️) to pass through, only reject hard errors (❌)
    if extracted_text.strip().startswith("❌"):
        raise HTTPException(status_code=400, detail=extracted_text)

    # 4️⃣ Chunk + embed
    chunks = chunk_text(extracted_text)
    add_document_chunks(chunks)

    return {
        "filename": file.filename,
        "characters_extracted": len(extracted_text),
        "chunks_created": len(chunks),
        "preview": extracted_text[:500]
    }
