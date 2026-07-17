from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.workspace import (
    Workspace,
    WorkspaceCreate,
    WorkspaceRead,
    WorkspaceStats,
    WorkspaceUpdate,
)
from app.repositories.workspace_repository import WorkspaceRepository


class WorkspaceNotFoundError(Exception):
    pass


class WorkspaceService:
    def __init__(self, workspace_repository: WorkspaceRepository):
        self._workspace_repository = workspace_repository

    async def create_workspace(self, owner_id: str, body: WorkspaceCreate) -> WorkspaceRead:
        workspace = Workspace(
            name=body.name,
            description=body.description,
            owner_id=PydanticObjectId(owner_id),
        )
        await self._workspace_repository.create(workspace)
        return self._to_read(workspace)

    async def list_workspaces(self, owner_id: str) -> list[WorkspaceRead]:
        workspaces = await self._workspace_repository.list_by_owner(PydanticObjectId(owner_id))
        return [self._to_read(ws) for ws in workspaces]

    async def get_workspace(self, owner_id: str, workspace_id: str) -> WorkspaceRead:
        workspace = await self._get_owned(owner_id, workspace_id)
        return self._to_read(workspace)

    async def update_workspace(
        self, owner_id: str, workspace_id: str, body: WorkspaceUpdate
    ) -> WorkspaceRead:
        workspace = await self._get_owned(owner_id, workspace_id)
        # exclude_unset keeps PATCH semantics; WorkspaceUpdate rejects
        # explicit nulls, so every present value is safe to assign.
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(workspace, field, value)
        workspace.updated_at = datetime.now(timezone.utc)
        await self._workspace_repository.save(workspace)
        return self._to_read(workspace)

    async def delete_workspace(self, owner_id: str, workspace_id: str) -> None:
        workspace = await self._get_owned(owner_id, workspace_id)
        await self._workspace_repository.delete(workspace)

    async def _get_owned(self, owner_id: str, workspace_id: str) -> Workspace:
        try:
            oid = PydanticObjectId(workspace_id)
        except Exception:
            raise WorkspaceNotFoundError
        workspace = await self._workspace_repository.get_by_id(oid)
        if workspace is None or workspace.owner_id != PydanticObjectId(owner_id):
            raise WorkspaceNotFoundError
        return workspace

    @staticmethod
    def _to_read(workspace: Workspace) -> WorkspaceRead:
        return WorkspaceRead(
            id=str(workspace.id),
            name=workspace.name,
            description=workspace.description,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            stats=WorkspaceStats(),
        )
