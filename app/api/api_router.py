from fastapi import APIRouter

from app.api.endpoints import characters, sessions, chat

api_router = APIRouter()

api_router.include_router(characters.router, prefix="/characters", tags=["Characters"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(chat.router, prefix="/sessions", tags=["Chat"])
