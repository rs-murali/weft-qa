from datetime import datetime, timezone

from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, Field

from app.models.enums import Severity


class Workspace(Document):
    name: str
    description: str = ""
    owner_id: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "workspaces"


class WorkspaceCreate(BaseModel):
    name: str
    description: str = ""


class WorkspaceStats(BaseModel):
    requirement_count: int = 0
    test_case_count: int = 0
    needs_review_count: int = 0
    orphaned_count: int = 0
    coverage_pct: float | None = None


class WorkspaceRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    stats: WorkspaceStats


class NeedsAttentionItem(BaseModel):
    workspace_id: str
    workspace_name: str
    message: str
    severity: Severity
