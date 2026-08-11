"""
Centralized Application Configuration Management
All configuration values are populated strictly from environment variables.
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application & Runtime Environment
    PROJECT_NAME: str = "InternMatch AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Supabase Infrastructure Credentials (Server-side ONLY for service role)
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "placeholder_jwt_secret_for_local_development"
    DATABASE_URL: str = (
        "postgresql://postgres:placeholder_password@placeholder_project.supabase.co:5432/postgres"
    )
    CV_STORAGE_BUCKET: str = "cvs"

    # Redis Async Task Queue
    REDIS_URL: str = "redis://redis:6379/0"

    # Pinned AI Engine & Vector Search Models (MUST NOT be hardcoded in business logic)
    OPENAI_API_KEY: str = ""
    LLM_MODEL_NAME: str = "gpt-4o-mini"
    EMBEDDING_MODEL_NAME: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # RapidFuzz Skill Matching Threshold (MVP Default: 85)
    SKILL_FUZZY_THRESHOLD: int = 85

    # RevenueCat Integration Credentials
    REVENUECAT_SECRET_KEY: str = ""

    # Security & CORS Origins Configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost:19006"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins string into a list."""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
