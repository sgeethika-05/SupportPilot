import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/supportpilot"
    SECRET_KEY: str = "your-256-bit-secret-key-change-in-production-at-least-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    APP_NAME: str = "SupportPilot"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    DEFAULT_TOP_K: int = 5
    MIN_SIMILARITY_THRESHOLD: float = 0.7
    CHUNK_SIZE: int = 150
    CHUNK_OVERLAP: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
