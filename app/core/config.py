import os

class Settings:
    PROJECT_NAME: str = "直男社交训练营 API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "AI 对话模拟器后端 - V1.0 (模块化重构版)"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./simulator.db")

    # LLM Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-vf5pnsyy9ajk8lgoqzjpnlsikdqsxnmzwaeo9t9skqr9zpdf6srgs5agheytq3o2")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "http://api.chinalco.com.cn/aimiddle/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "Qwen3.5-35B-A3B")

settings = Settings()
