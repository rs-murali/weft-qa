from beanie import PydanticObjectId

from app.models.workspace import Workspace


class WorkspaceRepository:
    async def create(self, workspace: Workspace) -> Workspace:
        await workspace.insert()
        return workspace

    async def list_by_owner(self, owner_id: PydanticObjectId) -> list[Workspace]:
        return await Workspace.find(Workspace.owner_id == owner_id).sort(-Workspace.updated_at).to_list()

    async def get_by_id(self, workspace_id: PydanticObjectId) -> Workspace | None:
        return await Workspace.get(workspace_id)

    async def save(self, workspace: Workspace) -> Workspace:
        await workspace.save()
        return workspace

    async def delete(self, workspace: Workspace) -> None:
        await workspace.delete()
