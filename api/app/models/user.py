from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import BaseModel, EmailStr, Field


class User(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    id: str
    email: str
