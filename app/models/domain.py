import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base, engine

def get_utc_now():
    return datetime.now(timezone.utc)

class CharacterModel(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False)
    greeting = Column(String, nullable=False)
    personality = Column(Text, nullable=False)
    scenario = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    sessions = relationship("SessionModel", back_populates="character", cascade="all, delete-orphan")

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String, nullable=False)
    character_id = Column(String, ForeignKey("characters.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=get_utc_now)

    character = relationship("CharacterModel", back_populates="sessions")
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")

class MessageModel(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False) # 'user' or 'girl'
    content = Column(Text, nullable=False)
    coach_analysis = Column(Text, nullable=True) # JSON 字符串
    created_at = Column(DateTime, default=get_utc_now)

    session = relationship("SessionModel", back_populates="messages")

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_db(db):
    if db.query(CharacterModel).count() == 0:
        char1 = CharacterModel(
            name="林晚",
            greeting="...有事吗？我还在忙。",
            personality="高冷、独立、毒舌、表面不在乎但内心有细腻的一面，说话直接不留情面。",
            scenario="你们是大学同学，毕业后偶然在微信上重新联系。她工作很忙，对你不冷不热。"
        )
        char2 = CharacterModel(
            name="苏甜",
            greeting="哥哥！今天也是元气满满的一天鸭~！",
            personality="元气、甜美、活泼、有点小绿茶、喜欢撒娇、经常用可爱的表情包和语气词。",
            scenario="你们是在漫展上认识的学妹，她对你表现得很热情，总是主动找你聊天。"
        )
        db.add_all([char1, char2])
        db.commit()
