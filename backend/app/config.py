from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    JARVIS_NAME: str = "JARVIS"
    USER_NAME: str = "Sanjith"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # AI settings
    OPENAI_API_KEY: str = Field(default="", env="OPENAI_API_KEY")
    AI_MODEL: str = "gpt-4o-mini"
    AI_TEMPERATURE: float = 0.7

    # Voice settings
    ENABLE_VOICE: bool = True
    VOICE_NAME: str = "Daniel"
    SPEECH_RATE: float = 1.0

    # Notifications
    ENABLE_NOTIFICATIONS: bool = True
    QUIET_MODE: bool = False
    QUIET_HOURS_START: str = "22:00"
    QUIET_HOURS_END: str = "07:00"

    # Paths
    WORKSPACE_PATH: str = str(BASE_DIR)
    DATABASE_PATH: str = str(DATA_DIR / "jarvis.db")
    ALLOW_CONFIRMATION_BYPASS: bool = False

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
