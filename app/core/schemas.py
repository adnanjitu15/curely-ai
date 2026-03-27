from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        example="I have chest pain and shortness of breath"
    )
    session_id: Optional[str] = Field(default=None, description="Session ID to persist chat history")


class SourceChunk(BaseModel):
    """A document chunk that was used to inform the AI's response."""
    text: str = Field(..., description="The relevant text excerpt from the uploaded document")
    score: float = Field(..., description="Relevance score (0-1, higher = more relevant)")


class ChatResponse(BaseModel):
    reply: str
    sources: list[SourceChunk] = Field(default=[], description="Document chunks used to generate this response")
    session_id: Optional[str] = Field(default=None, description="The session ID this message belongs to")


# ---- Session Schemas ----

class SessionCreateResponse(BaseModel):
    session_id: str
    title: str
    created_at: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[SourceChunk] = []
    created_at: str


class SessionDetailResponse(BaseModel):
    session_id: str
    title: str
    created_at: str
    messages: list[MessageResponse] = []


class SessionListItem(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int
