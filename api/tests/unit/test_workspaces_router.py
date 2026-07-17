from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.models.user import CurrentUser
from app.models.workspace import WorkspaceRead, WorkspaceStats, WorkspaceUpdate
from app.services.workspace_service import WorkspaceNotFoundError

OWNER_ID = "64" + "a" * 22
WORKSPACE_ID = "64" + "b" * 22


def _workspace_read(**overrides) -> WorkspaceRead:
    now = datetime.now(timezone.utc)
    data = dict(
        id=WORKSPACE_ID,
        name="Wishlist",
        description="Test suite for wishlist feature",
        created_at=now,
        updated_at=now,
        stats=WorkspaceStats(),
    )
    data.update(overrides)
    return WorkspaceRead(**data)


def _make_client(mock_service, authenticated: bool = True) -> TestClient:
    from main import app, container

    container.workspace_service.override(providers.Object(mock_service))
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=OWNER_ID, email="a@example.com"
        )
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    from main import app, container

    container.workspace_service.reset_override()
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# PATCH /workspaces/{id}
# ---------------------------------------------------------------------------

def test_update_workspace_success():
    service = AsyncMock()
    service.update_workspace.return_value = _workspace_read(name="Renamed")
    c = _make_client(service)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"name": "Renamed"})
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed"
    service.update_workspace.assert_awaited_once_with(
        OWNER_ID, WORKSPACE_ID, WorkspaceUpdate(name="Renamed")
    )


def test_update_workspace_not_found():
    service = AsyncMock()
    service.update_workspace.side_effect = WorkspaceNotFoundError()
    c = _make_client(service)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"name": "Renamed"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Workspace not found"


def test_update_workspace_rejects_empty_name():
    service = AsyncMock()
    c = _make_client(service)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"name": ""})
    assert res.status_code == 422
    service.update_workspace.assert_not_awaited()


def test_update_workspace_rejects_explicit_null_name():
    service = AsyncMock()
    c = _make_client(service)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"name": None})
    assert res.status_code == 422
    service.update_workspace.assert_not_awaited()


def test_update_workspace_rejects_explicit_null_description():
    service = AsyncMock()
    c = _make_client(service)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"description": None})
    assert res.status_code == 422
    service.update_workspace.assert_not_awaited()


def test_update_workspace_requires_auth():
    service = AsyncMock()
    c = _make_client(service, authenticated=False)

    res = c.patch(f"/workspaces/{WORKSPACE_ID}", json={"name": "Renamed"})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /workspaces/{id}
# ---------------------------------------------------------------------------

def test_delete_workspace_success():
    service = AsyncMock()
    service.delete_workspace.return_value = None
    c = _make_client(service)

    res = c.delete(f"/workspaces/{WORKSPACE_ID}")
    assert res.status_code == 204
    assert res.content == b""
    service.delete_workspace.assert_awaited_once_with(OWNER_ID, WORKSPACE_ID)


def test_delete_workspace_not_found():
    service = AsyncMock()
    service.delete_workspace.side_effect = WorkspaceNotFoundError()
    c = _make_client(service)

    res = c.delete(f"/workspaces/{WORKSPACE_ID}")
    assert res.status_code == 404


def test_delete_workspace_requires_auth():
    service = AsyncMock()
    c = _make_client(service, authenticated=False)

    res = c.delete(f"/workspaces/{WORKSPACE_ID}")
    assert res.status_code == 401
