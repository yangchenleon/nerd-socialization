from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import domain, schemas

router = APIRouter()

@router.post("/", response_model=schemas.SessionResponse)
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db)):
    db_character = db.query(domain.CharacterModel).filter(domain.CharacterModel.id == session.character_id).first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")

    db_session = domain.SessionModel(title=session.title, character_id=session.character_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=List[schemas.SessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(domain.SessionModel).order_by(domain.SessionModel.created_at.desc()).all()
    return sessions

@router.get("/{session_id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(domain.SessionModel).filter(domain.SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(domain.MessageModel).filter(
        domain.MessageModel.session_id == session_id
    ).order_by(domain.MessageModel.created_at.asc()).all()
    return messages
