import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "family_tree.db"


class Settings(BaseSettings):
    app_name: str = "FamilyTree — Родословное древо"
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    static_dir: str = os.getenv("STATIC_DIR", str(BASE_DIR.parent / "frontend" / "dist"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
