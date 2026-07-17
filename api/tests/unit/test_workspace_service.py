from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from beanie import PydanticObjectId

from app.models.workspace import Workspace, WorkspaceUpdate
from app.services.workspace_service import WorkspaceNotFoundError, WorkspaceService

OWNER_ID = PydanticObjectId()


def _workspace() -> Workspace:
    # model_construct sidesteps Beanie's collection-initialization check,
    # which plain construction trips outside a live init_beanie() setup.
    # A timestamp firmly in the past, so the bump assertion can't collide
    # with the update's now() on coarse clock ticks.
    past = datetime.now(timezone.utc) - timedelta(days=1)
    return Workspace.model_construct(
        id=PydanticObjectId(),
        name="Wishlist",
        description="original",
        owner_id=OWNER_ID,
        created_at=past,
        updated_at=past,
    )


def _service(workspace: Workspace | None):
    repo = AsyncMock()
    repo.get_by_id.return_value = workspace
    return WorkspaceService(workspace_repository=repo), repo


# ---------------------------------------------------------------------------
# update_workspace
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_sets_fields_and_bumps_updated_at():
    ws = _workspace()
    before = ws.updated_at
    service, repo = _service(ws)

    result = await service.update_workspace(
        str(OWNER_ID), str(ws.id), WorkspaceUpdate(name="Renamed", description="new")
    )

    assert result.name == "Renamed"
    assert result.description == "new"
    assert ws.updated_at > before
    repo.save.assert_awaited_once_with(ws)


@pytest.mark.asyncio
async def test_update_leaves_omitted_fields_untouched():
    ws = _workspace()
    service, _ = _service(ws)

    result = await service.update_workspace(
        str(OWNER_ID), str(ws.id), WorkspaceUpdate(name="Renamed")
    )

    assert result.name == "Renamed"
    assert result.description == "original"


@pytest.mark.asyncio
async def test_update_rejects_other_owner():
    ws = _workspace()
    service, repo = _service(ws)

    with pytest.raises(WorkspaceNotFoundError):
        await service.update_workspace(
            str(PydanticObjectId()), str(ws.id), WorkspaceUpdate(name="Renamed")
        )
    repo.save.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_missing_workspace():
    service, _ = _service(None)

    with pytest.raises(WorkspaceNotFoundError):
        await service.update_workspace(
            str(OWNER_ID), str(PydanticObjectId()), WorkspaceUpdate(name="Renamed")
        )


@pytest.mark.asyncio
async def test_update_invalid_object_id():
    service, repo = _service(None)

    with pytest.raises(WorkspaceNotFoundError):
        await service.update_workspace(str(OWNER_ID), "not-an-id", WorkspaceUpdate(name="x"))
    repo.get_by_id.assert_not_awaited()


# ---------------------------------------------------------------------------
# delete_workspace
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_removes_owned_workspace():
    ws = _workspace()
    service, repo = _service(ws)

    await service.delete_workspace(str(OWNER_ID), str(ws.id))

    repo.delete.assert_awaited_once_with(ws)


@pytest.mark.asyncio
async def test_delete_rejects_other_owner():
    ws = _workspace()
    service, repo = _service(ws)

    with pytest.raises(WorkspaceNotFoundError):
        await service.delete_workspace(str(PydanticObjectId()), str(ws.id))
    repo.delete.assert_not_awaited()
