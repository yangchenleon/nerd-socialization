from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CharacterCreate(BaseModel):
    name: str
    greeting: str
    personality: str
    scenario: str

class CharacterResponse(BaseModel):
    id: str
    name: str
    greeting: str
    personality: str
    scenario: str
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: str
    character_id: str

class SessionResponse(BaseModel):
    id: str
    title: str
    character_id: str
    created_at: datetime
    character: Optional[CharacterResponse] = None

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    role: str
    content: str
    coach_analysis: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    coach_analysis: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    user_text: str

class ChatResponse(BaseModel):
    message: MessageResponse
    coach_analysis: Optional[dict] = None
