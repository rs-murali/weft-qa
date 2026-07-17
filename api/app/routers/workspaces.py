from fastapi import APIRouter, Depends, HTTPException, status
from dependency_injector.wiring import inject, Provide

from app.core.container import Container
from app.core.deps import get_current_user
from app.models.user import CurrentUser
from app.models.workspace import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate
from app.services.workspace_service import WorkspaceNotFoundError, WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WorkspaceRead)
@inject
async def create_workspace(
    body: WorkspaceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(Provide[Container.workspace_service]),
):
    return await workspace_service.create_workspace(current_user.id, body)


@router.get("", response_model=list[WorkspaceRead])
@inject
async def list_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(Provide[Container.workspace_service]),
):
    return await workspace_service.list_workspaces(current_user.id)


@router.get("/{workspace_id}", response_model=WorkspaceRead)
@inject
async def get_workspace(
    workspace_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(Provide[Container.workspace_service]),
):
    try:
        return await workspace_service.get_workspace(current_user.id, workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
@inject
async def update_workspace(
    workspace_id: str,
    body: WorkspaceUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(Provide[Container.workspace_service]),
):
    try:
        return await workspace_service.update_workspace(current_user.id, workspace_id, body)
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_workspace(
    workspace_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(Provide[Container.workspace_service]),
):
    try:
        await workspace_service.delete_workspace(current_user.id, workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
