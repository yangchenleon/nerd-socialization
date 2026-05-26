import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import domain, schemas
from app.services.llm_service import generate_chat_response

router = APIRouter()

@router.post("/{session_id}/chat", response_model=schemas.ChatResponse)
async def chat(session_id: str, request: schemas.ChatRequest, db: Session = Depends(get_db)):
    db_session = db.query(domain.SessionModel).filter(domain.SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    character = db_session.character

    user_message = domain.MessageModel(
        session_id=session_id,
        role="user",
        content=request.user_text
    )
    db.add(user_message)
    db.commit()

    recent_messages = db.query(domain.MessageModel).filter(
        domain.MessageModel.session_id == session_id
    ).order_by(domain.MessageModel.created_at.desc()).limit(10).all()
    recent_messages.reverse()

    girl_reply_text, coach_analysis_data = await generate_chat_response(character, recent_messages)

    girl_message = domain.MessageModel(
        session_id=session_id,
        role="girl",
        content=girl_reply_text,
        coach_analysis=json.dumps(coach_analysis_data, ensure_ascii=False)
    )
    db.add(girl_message)
    db.commit()
    db.refresh(girl_message)

    return schemas.ChatResponse(
        message=schemas.MessageResponse.model_validate(girl_message),
        coach_analysis=coach_analysis_data
    )
