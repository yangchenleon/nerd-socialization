from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import domain, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.CharacterResponse])
def get_characters(db: Session = Depends(get_db)):
    characters = db.query(domain.CharacterModel).order_by(domain.CharacterModel.created_at.asc()).all()
    return characters

@router.post("/", response_model=schemas.CharacterResponse)
def create_character(character: schemas.CharacterCreate, db: Session = Depends(get_db)):
    db_character = domain.CharacterModel(
        name=character.name,
        greeting=character.greeting,
        personality=character.personality,
        scenario=character.scenario
    )
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character
