"""
SQLAlchemy ORM Models for Chat History Persistence.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship

from app.db.database import Base


class ChatSession(Base):
    """Represents a single conversation thread."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), default="New Consultation")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Represents a single message within a chat session."""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False)  # "user" or "ai"
    content = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")  # Serialized JSON of source chunks
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ChatSession", back_populates="messages")
