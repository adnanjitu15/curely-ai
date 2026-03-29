"""
Curely AI — Unit Tests
======================
Comprehensive test suite for the medical RAG chatbot backend.

Tests cover:
1. Pydantic schemas (validation, serialization)
2. Chat service (keyword detection, routing logic)
3. API endpoints (health, chat, sessions, upload)
4. Database models (session CRUD, message persistence)
5. Vector store (add chunks, semantic search)

Run with: pytest app/tests/ -v
"""

import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock

# ============================================================
# 0. MOCK HEAVYWEIGHT DEPENDENCIES (UNBLOCK LOCAL TESTS)
# ============================================================
mock_modules = [
    "faiss", 
    "sentence_transformers", 
    "google.genai", 
    "google",
    "pdf2image",
    "pytesseract",
    "pypdf",
    "docx"
]
for mod in mock_modules:
    sys.modules[mod] = MagicMock()

# Mock specific classes/methods needed for imports
import faiss
faiss.IndexFlatIP = MagicMock

import sentence_transformers
sentence_transformers.SentenceTransformer = MagicMock

from fastapi.testclient import TestClient

# ============================================================
# 1. SCHEMA VALIDATION TESTS
# ============================================================

class TestSchemas:
    """Test Pydantic schema validation and serialization."""

    def test_chat_request_valid(self):
        """ChatRequest should accept valid medical queries."""
        from app.core.schemas import ChatRequest
        req = ChatRequest(message="I have a headache")
        assert req.message == "I have a headache"
        assert req.session_id is None

    def test_chat_request_with_session(self):
        """ChatRequest should accept an optional session_id."""
        from app.core.schemas import ChatRequest
        req = ChatRequest(message="What about my report?", session_id="abc-123")
        assert req.session_id == "abc-123"

    def test_chat_request_empty_rejected(self):
        """ChatRequest should reject empty messages."""
        from app.core.schemas import ChatRequest
        with pytest.raises(Exception):
            ChatRequest(message="")

    def test_chat_request_too_long_rejected(self):
        """ChatRequest should reject messages over 5000 chars."""
        from app.core.schemas import ChatRequest
        with pytest.raises(Exception):
            ChatRequest(message="x" * 5001)

    def test_source_chunk_model(self):
        """SourceChunk should serialize text and score correctly."""
        from app.core.schemas import SourceChunk
        chunk = SourceChunk(text="Patient has elevated glucose", score=0.87)
        assert chunk.text == "Patient has elevated glucose"
        assert chunk.score == 0.87

    def test_chat_response_model(self):
        """ChatResponse should include reply, sources, and session_id."""
        from app.core.schemas import ChatResponse, SourceChunk
        resp = ChatResponse(
            reply="Your glucose is high.",
            sources=[SourceChunk(text="Glucose: 180", score=0.9)],
            session_id="session-1"
        )
        assert resp.reply == "Your glucose is high."
        assert len(resp.sources) == 1
        assert resp.session_id == "session-1"

    def test_chat_response_defaults(self):
        """ChatResponse should have empty sources and None session_id by default."""
        from app.core.schemas import ChatResponse
        resp = ChatResponse(reply="Hello!")
        assert resp.sources == []
        assert resp.session_id is None

    def test_session_create_response(self):
        """SessionCreateResponse should have session_id, title, created_at."""
        from app.core.schemas import SessionCreateResponse
        resp = SessionCreateResponse(session_id="abc", title="New Consultation", created_at="2026-03-28T00:00:00")
        assert resp.session_id == "abc"
        assert resp.title == "New Consultation"

    def test_session_list_item(self):
        """SessionListItem should include message_count."""
        from app.core.schemas import SessionListItem
        item = SessionListItem(
            session_id="abc", title="Headache chat",
            created_at="2026-03-28T00:00:00", updated_at="2026-03-28T00:01:00",
            message_count=5
        )
        assert item.message_count == 5


# ============================================================
# 2. CHAT SERVICE TESTS (Keyword Detection & Routing)
# ============================================================

class TestChatService:
    """Test the chat service's keyword detection and routing logic."""

    def test_emergency_detection(self):
        """Emergency keywords should be detected."""
        from app.services.chat_service import is_emergency
        assert is_emergency("i was bitten by snake") is True
        assert is_emergency("heavy bleeding from wound") is True
        assert is_emergency("i have a cold") is False

    def test_medical_query_detection(self):
        """Medical keywords should be detected."""
        from app.services.chat_service import is_medical_query
        assert is_medical_query("i have fever and cough") is True
        assert is_medical_query("i want to lose weight") is True
        assert is_medical_query("what is the weather today") is False

    def test_greeting_detection(self):
        """Greetings should be detected."""
        from app.services.chat_service import is_greeting
        assert is_greeting("hello doctor") is True
        assert is_greeting("assalamualaikum") is True
        assert is_greeting("my head hurts") is False

    def test_empathy_detection(self):
        """Empathy keywords should be detected."""
        from app.services.chat_service import needs_empathy
        assert needs_empathy("i am feeling sick") is True
        assert needs_empathy("i have pain in my chest") is True
        assert needs_empathy("what is dna") is False

    def test_fallback_emergency_response(self):
        """Without API key, emergency messages should get urgent response."""
        from app.services.chat_service import generate_chat_reply
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            reply = generate_chat_reply("I think I'm having a heart attack")
            assert "emergency" in reply.lower() or "⚠️" in reply

    def test_fallback_greeting_response(self):
        """Without API key, greetings should get a friendly response."""
        from app.services.chat_service import generate_chat_reply
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            reply = generate_chat_reply("Hello")
            assert "hello" in reply.lower() or "curely" in reply.lower()

    def test_fallback_non_medical_response(self):
        """Without API key, non-medical queries should be redirected."""
        from app.services.chat_service import generate_chat_reply
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            reply = generate_chat_reply("What is quantum physics")
            assert "health" in reply.lower() or "medical" in reply.lower()


# ============================================================
# 3. API ENDPOINT TESTS (FastAPI TestClient)
# ============================================================

class TestAPIEndpoints:
    """Test the FastAPI REST API endpoints."""

    @pytest.fixture(autouse=True)
    def setup_client(self):
        """Create a test client with a fresh in-memory database."""
        from app.main import app
        from app.db.database import get_db, Base
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        from sqlalchemy.pool import StaticPool

        # 1. Setup in-memory test database with StaticPool to share connection across threads
        SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, 
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # 2. Create tables
        from app.db.models import ChatSession, ChatMessage
        Base.metadata.create_all(bind=engine)

        # 3. Dependency override
        def override_get_db():
            try:
                db = TestingSessionLocal()
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        
        yield
        
        # 4. Clean up
        app.dependency_overrides.clear()

    def test_root_endpoint(self):
        """GET / should return API status."""
        response = self.client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Curely AI Medical RAG API running"
        assert data["version"] == "1.0.0"

    def test_health_endpoint(self):
        """GET /health should return healthy status."""
        response = self.client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_create_session(self):
        """POST /sessions should create a new chat session."""
        response = self.client.post("/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["title"] == "New Consultation"

    def test_get_session(self):
        """GET /sessions/{id} should return session details."""
        # Create a session first
        create_resp = self.client.post("/sessions")
        sid = create_resp.json()["session_id"]
        # Fetch it
        response = self.client.get(f"/sessions/{sid}")
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == sid
        assert data["messages"] == []

    def test_get_nonexistent_session(self):
        """GET /sessions/{bad_id} should return 404."""
        response = self.client.get("/sessions/nonexistent-id")
        assert response.status_code == 404

    def test_delete_session(self):
        """DELETE /sessions/{id} should remove the session."""
        create_resp = self.client.post("/sessions")
        sid = create_resp.json()["session_id"]
        # Delete it
        del_resp = self.client.delete(f"/sessions/{sid}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"
        # Verify it's gone
        get_resp = self.client.get(f"/sessions/{sid}")
        assert get_resp.status_code == 404

    def test_list_sessions(self):
        """GET /sessions should return a list of all sessions."""
        # Create two sessions
        self.client.post("/sessions")
        self.client.post("/sessions")
        response = self.client.get("/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_chat_without_session(self):
        """POST /chat without session_id should still work."""
        with patch("app.main.generate_chat_reply", return_value="Mocked reply"), \
             patch("app.main.generate_chat_reply_with_context", return_value="Mocked reply"), \
             patch("app.main.semantic_search_with_scores", return_value=[]):
            response = self.client.post("/chat", json={"message": "Hi doctor"})
            assert response.status_code == 200
            assert "reply" in response.json()

    def test_chat_with_session(self):
        """POST /chat with session_id should persist messages."""
        # Create session
        create_resp = self.client.post("/sessions")
        sid = create_resp.json()["session_id"]
        # Send a chat message
        with patch("app.main.generate_chat_reply", return_value="Mocked reply"), \
             patch("app.main.generate_chat_reply_with_context", return_value="Mocked reply"), \
             patch("app.main.semantic_search_with_scores", return_value=[]):
            chat_resp = self.client.post("/chat", json={"message": "Hello", "session_id": sid})
            assert chat_resp.status_code == 200
            assert chat_resp.json()["session_id"] == sid
        # Verify messages were persisted
        session_resp = self.client.get(f"/sessions/{sid}")
        messages = session_resp.json()["messages"]
        assert len(messages) == 2  # user + ai
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "ai"

    def test_chat_invalid_empty_message(self):
        """POST /chat with empty message should be rejected."""
        response = self.client.post("/chat", json={"message": ""})
        assert response.status_code == 422  # Pydantic validation error

    def test_upload_invalid_file_type(self):
        """POST /upload with unsupported file type should return 400."""
        from io import BytesIO
        response = self.client.post(
            "/upload",
            files={"file": ("test.txt", BytesIO(b"hello"), "text/plain")}
        )
        assert response.status_code == 400


# ============================================================
# 4. DATABASE MODEL TESTS
# ============================================================

class TestDatabaseModels:
    """Test SQLAlchemy models and database operations."""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        """Create a fresh in-memory database for each test."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.db.database import Base
        from app.db.models import ChatSession, ChatMessage
        from sqlalchemy.pool import StaticPool

        engine = create_engine(
            "sqlite:///:memory:", 
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        TestSession = sessionmaker(bind=engine)
        self.db = TestSession()
        self.ChatSession = ChatSession
        self.ChatMessage = ChatMessage
        yield
        self.db.close()

    def test_create_session(self):
        """Should create a ChatSession with auto-generated UUID."""
        session = self.ChatSession(title="Test Session")
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        assert session.id is not None
        assert len(session.id) == 36  # UUID format
        assert session.title == "Test Session"

    def test_create_message(self):
        """Should create a ChatMessage linked to a session."""
        session = self.ChatSession()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        msg = self.ChatMessage(session_id=session.id, role="user", content="Hi there!")
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)

        assert msg.role == "user"
        assert msg.content == "Hi there!"
        assert msg.session_id == session.id

    def test_session_messages_relationship(self):
        """Session.messages should return all linked messages in order."""
        session = self.ChatSession()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        self.db.add(self.ChatMessage(session_id=session.id, role="user", content="Hello"))
        self.db.add(self.ChatMessage(session_id=session.id, role="ai", content="Hi!"))
        self.db.commit()

        self.db.refresh(session)
        assert len(session.messages) == 2
        assert session.messages[0].role == "user"
        assert session.messages[1].role == "ai"

    def test_cascade_delete(self):
        """Deleting a session should also delete its messages."""
        session = self.ChatSession()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        sid = session.id

        self.db.add(self.ChatMessage(session_id=sid, role="user", content="Test"))
        self.db.commit()

        # Delete session
        self.db.delete(session)
        self.db.commit()

        # Messages should be gone too
        remaining = self.db.query(self.ChatMessage).filter_by(session_id=sid).all()
        assert len(remaining) == 0

    def test_sources_json_storage(self):
        """ChatMessage should store sources as serialized JSON."""
        session = self.ChatSession()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        sources = json.dumps([{"text": "Glucose: 180mg/dL", "score": 0.92}])
        msg = self.ChatMessage(
            session_id=session.id, role="ai",
            content="Your glucose is elevated.",
            sources_json=sources
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)

        parsed = json.loads(msg.sources_json)
        assert len(parsed) == 1
        assert parsed[0]["score"] == 0.92


# ============================================================
# 5. PDF SERVICE TESTS
# ============================================================

class TestPDFService:
    """Test text extraction and chunking utilities."""

    def test_chunk_text_basic(self):
        """chunk_text should split long text into manageable pieces."""
        from app.services.pdf_service import chunk_text
        long_text = "Medical report. " * 200  # ~3200 chars
        chunks = chunk_text(long_text, chunk_size=500)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 500  # Each chunk should be reasonable size

    def test_chunk_text_short(self):
        """Short text should produce a single chunk."""
        from app.services.pdf_service import chunk_text
        chunks = chunk_text("Patient is healthy.")
        assert len(chunks) == 1
        assert chunks[0] == "Patient is healthy."

    def test_chunk_text_empty(self):
        """Empty text should produce no chunks."""
        from app.services.pdf_service import chunk_text
        chunks = chunk_text("")
        assert len(chunks) == 0
        
        chunks = chunk_text("   ")
        assert len(chunks) == 0
