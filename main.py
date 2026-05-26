import uuid
import json
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session as DBSession, relationship
from pydantic import BaseModel
from openai import AsyncOpenAI

# 初始化 OpenAI 客户端
# 接入本地模型中台
api_key = "sk-vf5pnsyy9ajk8lgoqzjpnlsikdqsxnmzwaeo9t9skqr9zpdf6srgs5agheytq3o2"
base_url = "http://api.chinalco.com.cn/aimiddle/v1"
client = AsyncOpenAI(api_key=api_key, base_url=base_url)

# ==========================================
# 1. 数据库配置 (Database Setup)
# ==========================================
DATABASE_URL = "sqlite:///./simulator.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 2. 数据库模型 (SQLAlchemy Models)
# ==========================================
def get_utc_now():
    return datetime.now(timezone.utc)

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

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

# 初始化数据库表的函数
def init_db():
    Base.metadata.create_all(bind=engine)

# ==========================================
# 3. Pydantic 验证模型 (Schemas)
# ==========================================
class SessionCreate(BaseModel):
    title: str

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

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

# ==========================================
# 4. FastAPI 应用和路由 (FastAPI App & Routes)
# ==========================================
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 在应用启动时初始化数据库
    init_db()
    yield
    # 应用关闭时的清理工作 (如需要)

app = FastAPI(
    title="直男社交训练营 API",
    description="AI 对话模拟器后端基础代码",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有前端跨域请求
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 依赖项：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API: 创建一个新会话
@app.post("/sessions", response_model=SessionResponse, tags=["Sessions"])
def create_session(session: SessionCreate, db: DBSession = Depends(get_db)):
    db_session = SessionModel(title=session.title)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

# API: 获取所有会话列表
@app.get("/sessions", response_model=List[SessionResponse], tags=["Sessions"])
def get_sessions(db: DBSession = Depends(get_db)):
    # 按照创建时间倒序返回会话
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()
    return sessions

# API: 获取特定会话的历史消息记录（按时间正序）
@app.get("/sessions/{session_id}/messages", response_model=List[MessageResponse], tags=["Messages"])
def get_messages(session_id: str, db: DBSession = Depends(get_db)):
    # 检查会话是否存在
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 获取消息并按照时间正序排列
    messages = db.query(MessageModel).filter(
        MessageModel.session_id == session_id
    ).order_by(MessageModel.created_at.asc()).all()
    return messages

# API: 处理聊天对话与上下文
@app.post("/sessions/{session_id}/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(session_id: str, request: ChatRequest, db: DBSession = Depends(get_db)):
    # 1. 检查会话是否存在
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. 保存用户输入的消息
    user_message = MessageModel(
        session_id=session_id,
        role="user",
        content=request.user_text
    )
    db.add(user_message)
    db.commit()

    # 3. 获取最近的 10 条历史消息
    # 先按降序取最新的 10 条，然后再翻转回来以保持时间正序
    recent_messages = db.query(MessageModel).filter(
        MessageModel.session_id == session_id
    ).order_by(MessageModel.created_at.desc()).limit(10).all()
    recent_messages.reverse()

    # 4. 组装发给大模型的 messages 数组（核心：纯净对话，过滤教练分析）
    system_prompt = (
        "你扮演高冷女孩林晚。你们正在微信上聊天。\n"
        "你需要在回复用户的同时，在后台输出心理分析的JSON。\n"
        "请严格返回JSON格式，结构如下：\n"
        "{\n"
        "  \"coach_analysis\": {\"flaw\": \"指出男方话语中的直男问题/缺点\", \"subtext\": \"女方真实的潜台词/心理活动\", \"advice\": \"教练给男方的建议\"},\n"
        "  \"girl_reply\": {\"reply_text\": \"林晚发给男方的具体文字内容\"}\n"
        "}\n"
        "注意：请直接返回合法的 JSON 文本，不要包裹 Markdown 的 ```json 标签，也不要包含任何多余的解释。"
    )
    
    gpt_messages = [{"role": "system", "content": system_prompt}]
    
    for msg in recent_messages:
        role = "assistant" if msg.role == "girl" else "user"
        gpt_messages.append({"role": role, "content": msg.content})

    # 5. 调用 OpenAI API (返回 JSON 对象)
    try:
        completion = await client.chat.completions.create(
            model="Qwen3.5-35B-A3B",
            messages=gpt_messages,
            temperature=0.7
            # 移除了 response_format 以避免本地中台不支持该参数报错，依靠 Prompt 约束返回 JSON
        )
        
        # 解析返回的 JSON 字符串
        response_content = completion.choices[0].message.content.strip()
        
        # 兼容处理：如果模型依然返回了 markdown 代码块包裹的 JSON，将其去除
        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]
        response_content = response_content.strip()
        
        response_json = json.loads(response_content)
        
        girl_reply_text = response_json.get("girl_reply", {}).get("reply_text", "")
        coach_analysis_data = response_json.get("coach_analysis", {})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # 6. 保存女方的回复和教练分析到数据库
    girl_message = MessageModel(
        session_id=session_id,
        role="girl",
        content=girl_reply_text,
        coach_analysis=json.dumps(coach_analysis_data, ensure_ascii=False)
    )
    db.add(girl_message)
    db.commit()
    db.refresh(girl_message)

    # 7. 返回结果
    return ChatResponse(
        message=MessageResponse.model_validate(girl_message),
        coach_analysis=coach_analysis_data
    )


