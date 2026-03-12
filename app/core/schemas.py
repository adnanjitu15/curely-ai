from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        example="I have chest pain and shortness of breath"
    )

class ChatResponse(BaseModel):
    reply: str
