from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    """Application settings. Loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    openrouter_api_key: str = Field(..., env="OPENROUTER_API_KEY")


app_config = AppConfig()
