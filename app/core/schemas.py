from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        example="I have chest pain and shortness of breath"
    )

class SourceChunk(BaseModel):
    """A document chunk that was used to inform the AI's response."""
    text: str = Field(..., description="The relevant text excerpt from the uploaded document")
    score: float = Field(..., description="Relevance score (0-1, higher = more relevant)")

class ChatResponse(BaseModel):
    reply: str
    sources: list[SourceChunk] = Field(default=[], description="Document chunks used to generate this response")
