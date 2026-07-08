from beanie import PydanticObjectId

from app.models.workspace import Workspace, WorkspaceCreate, WorkspaceRead, WorkspaceStats
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
        try:
            oid = PydanticObjectId(workspace_id)
        except Exception:
            raise WorkspaceNotFoundError
        workspace = await self._workspace_repository.get_by_id(oid)
        if workspace is None or workspace.owner_id != PydanticObjectId(owner_id):
            raise WorkspaceNotFoundError
        return self._to_read(workspace)

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
