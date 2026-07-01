from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    """Application settings. Loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    openrouter_api_key: str = Field(..., env="OPENROUTER_API_KEY")

    mongodb_uri: str = Field("mongodb://localhost:27017", env="MONGODB_URI")
    mongodb_db_name: str = Field("weft_qa", env="MONGODB_DB_NAME")

    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_expire_minutes: int = Field(60, env="JWT_EXPIRE_MINUTES")


app_config = AppConfig()
