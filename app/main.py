from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid

from app.core.schemas import ChatRequest, ChatResponse, SourceChunk
from app.services.pdf_service import extract_text_from_pdf, extract_text_from_image, extract_text_from_doc, chunk_text
from app.services.chat_service import generate_chat_reply, generate_chat_reply_with_context
from app.services.vector_store import add_document_chunks, semantic_search_with_scores

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Curely AI — Medical RAG Backend",
    description="AI-powered medical chatbot with document understanding using RAG (Retrieval-Augmented Generation)",
    version="1.0.0"
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
    return {"status": "Curely AI Medical RAG API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ---------------- CHAT ----------------

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Process a chat message with optional RAG context from uploaded documents.
    
    Pipeline:
    1. Semantic search over FAISS vector store for relevant document chunks
    2. If context found → generate reply WITH document context (RAG)
    3. If no context → generate a standalone medical response
    4. Return reply + source attribution (which chunks informed the answer)
    """
    # 1️⃣ Semantic search over FAISS index (returns chunks with relevance scores)
    search_results = semantic_search_with_scores(request.message, top_k=3)
    
    # Filter to only chunks with meaningful relevance (score > 0.15)
    # OR if the user explicitly mentions the report, pass the top chunks anyway 
    # so the LLM knows the document was uploaded.
    keywords = ["report", "upload", "image", "document", "file", "pic", "test", "result", "give", "get"]
    has_keyword = any(w in request.message.lower() for w in keywords)
    
    relevant_results = [r for r in search_results if r["score"] > 0.15 or has_keyword]
    
    # Build source attribution
    sources = [
        SourceChunk(text=r["text"][:200] + "..." if len(r["text"]) > 200 else r["text"], score=r["score"])
        for r in relevant_results
    ]
    
    # 2️⃣ Generate reply
    if relevant_results:
        # Combine top relevant chunks as context
        combined_context = "\n\n".join([r["text"] for r in relevant_results])
        base_reply = generate_chat_reply_with_context(request.message, combined_context)
    else:
        base_reply = generate_chat_reply(request.message)

    return ChatResponse(reply=base_reply, sources=sources)

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
