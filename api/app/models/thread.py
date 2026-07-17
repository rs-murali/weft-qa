from datetime import datetime, timezone
from uuid import uuid4

from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, Field


class Thread(Document):
    thread_id: Indexed(str, unique=True)
    workspace_id: Indexed(PydanticObjectId)
    title: str = "New chat"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "threads"

    @classmethod
    def new(cls, workspace_id: PydanticObjectId, title: str = "New chat") -> "Thread":
        return cls.model_construct(
            thread_id=str(uuid4()),
            workspace_id=workspace_id,
            title=title,
        )


class ThreadRead(BaseModel):
    thread_id: str
    workspace_id: str
    title: str
    created_at: datetime
    updated_at: datetime
