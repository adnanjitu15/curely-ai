from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import json

from sqlalchemy.orm import Session

from app.core.schemas import (
    ChatRequest, ChatResponse, SourceChunk,
    SessionCreateResponse, SessionDetailResponse, MessageResponse, SessionListItem
)
from app.services.pdf_service import extract_text_from_pdf, extract_text_from_image, extract_text_from_doc, chunk_text
from app.services.chat_service import generate_chat_reply, generate_chat_reply_with_context
from app.services.vector_store import add_document_chunks, semantic_search_with_scores

from app.db.database import get_db, init_db
from app.db.models import ChatSession, ChatMessage

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Curely AI — Medical RAG Backend",
    description="AI-powered medical chatbot with document understanding using RAG (Retrieval-Augmented Generation)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- STARTUP ----------------

@app.on_event("startup")
def on_startup():
    """Initialize the database tables on server start."""
    init_db()

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

# ---------------- SESSION MANAGEMENT ----------------

@app.post("/sessions", response_model=SessionCreateResponse)
def create_session(db: Session = Depends(get_db)):
    """Create a new chat session."""
    session = ChatSession(title="New Consultation")
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionCreateResponse(
        session_id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat()
    )


@app.get("/sessions", response_model=list[SessionListItem])
def list_sessions(db: Session = Depends(get_db)):
    """List all chat sessions, most recent first."""
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [
        SessionListItem(
            session_id=s.id,
            title=s.title,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            message_count=len(s.messages)
        )
        for s in sessions
    ]


@app.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a session with its full message history."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = []
    for msg in session.messages:
        sources = []
        try:
            sources_data = json.loads(msg.sources_json) if msg.sources_json else []
            sources = [SourceChunk(text=s["text"], score=s["score"]) for s in sources_data]
        except (json.JSONDecodeError, KeyError):
            pass

        messages.append(MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            sources=sources,
            created_at=msg.created_at.isoformat()
        ))

    return SessionDetailResponse(
        session_id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat(),
        messages=messages
    )


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted", "session_id": session_id}

# ---------------- CHAT ----------------

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Process a chat message with optional RAG context from uploaded documents.
    
    Pipeline:
    1. Semantic search over FAISS vector store for relevant document chunks
    2. If context found → generate reply WITH document context (RAG)
    3. If no context → generate a standalone medical response
    4. Return reply + source attribution (which chunks informed the answer)
    5. If session_id provided → persist both user message and AI reply to the database
    """
    # 1️⃣ Semantic search over vector store (returns chunks with relevance scores)
    search_results = semantic_search_with_scores(request.message, top_k=3)
    
    # If documents were uploaded, ALWAYS pass context to the LLM
    # (even if the user's message is vague like "what should I do?")
    # This ensures the AI always analyzes uploaded documents.
    if search_results:
        relevant_results = search_results  # Use ALL results — the LLM is smart enough to decide relevance
    else:
        relevant_results = []
    
    # Build source attribution
    sources = [
        SourceChunk(text=r["text"][:200] + "..." if len(r["text"]) > 200 else r["text"], score=r["score"])
        for r in relevant_results
    ]
    
    # 2️⃣ Build chat history context from the database (if session exists)
    chat_history_text = ""
    if request.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if session and session.messages:
            # Get the last 10 messages for context (to keep token count reasonable)
            recent_messages = session.messages[-10:]
            history_lines = []
            for msg in recent_messages:
                role_label = "Patient" if msg.role == "user" else "Curely AI"
                history_lines.append(f"{role_label}: {msg.content}")
            chat_history_text = "\n".join(history_lines)

    # 3️⃣ Generate reply
    if relevant_results:
        # Combine top relevant chunks as context
        combined_context = "\n\n".join([r["text"] for r in relevant_results])
        if chat_history_text:
            combined_context = f"[Previous Conversation]:\n{chat_history_text}\n\n[Document Context]:\n{combined_context}"
        base_reply = generate_chat_reply_with_context(request.message, combined_context, provider=request.provider)
    else:
        if chat_history_text:
            base_reply = generate_chat_reply_with_context(request.message, f"[Previous Conversation]:\n{chat_history_text}", provider=request.provider)
        else:
            base_reply = generate_chat_reply(request.message, provider=request.provider)

    # 4️⃣ Persist to database (if session_id provided)
    active_session_id = request.session_id
    if active_session_id:
        session = db.query(ChatSession).filter(ChatSession.id == active_session_id).first()
        if session:
            # Save user message
            user_msg = ChatMessage(
                session_id=active_session_id,
                role="user",
                content=request.message
            )
            db.add(user_msg)

            # Save AI reply
            sources_json = json.dumps([{"text": s.text, "score": s.score} for s in sources])
            ai_msg = ChatMessage(
                session_id=active_session_id,
                role="ai",
                content=base_reply,
                sources_json=sources_json
            )
            db.add(ai_msg)

            # Auto-title the session based on the first user message
            if len(session.messages) == 0:
                title = request.message[:80] + ("..." if len(request.message) > 80 else "")
                session.title = title

            db.commit()

    return ChatResponse(reply=base_reply, sources=sources, session_id=active_session_id)

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
