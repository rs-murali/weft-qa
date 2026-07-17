from unittest.mock import AsyncMock
import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.models.user import CurrentUser
from app.services.workspace_service import WorkspaceNotFoundError
from app.services.thread_service import ThreadNotFoundError
from app.models.workspace import WorkspaceRead, WorkspaceStats
from app.models.thread import ThreadRead
from datetime import datetime, timezone

OWNER_ID = "64" + "a" * 22
WORKSPACE_ID = "64" + "b" * 22
THREAD_ID = "uuid-1234-abcd"


def _make_client(mock_workspace_service, mock_weft_agent, mock_thread_service=None, authenticated: bool = True) -> TestClient:
    from main import app, container

    container.workspace_service.override(providers.Object(mock_workspace_service))
    container.weft_agent.override(providers.Object(mock_weft_agent))
    if mock_thread_service:
        container.thread_service.override(providers.Object(mock_thread_service))
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
    container.weft_agent.reset_override()
    container.thread_service.reset_override()
    app.dependency_overrides.clear()


def test_chat_stream_success_new_thread():
    ws_service = AsyncMock()
    now = datetime.now(timezone.utc)
    ws_service.get_workspace.return_value = WorkspaceRead(
        id=WORKSPACE_ID,
        name="Wishlist",
        description="original",
        created_at=now,
        updated_at=now,
        stats=WorkspaceStats(),
    )

    t_service = AsyncMock()
    t_service.create_thread.return_value = ThreadRead(
        thread_id=THREAD_ID,
        workspace_id=WORKSPACE_ID,
        title="New chat",
        created_at=now,
        updated_at=now,
    )

    agent = AsyncMock()
    agent.get_pending_interrupt.return_value = None
    async def fake_astream(*args, **kwargs):
        yield b'{"type": "done"}\n'
    agent.astream = fake_astream

    c = _make_client(ws_service, agent, t_service)

    res = c.post(
        "/chat/stream",
        json={
            "messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}],
            "workspace_id": WORKSPACE_ID,
        },
    )
    assert res.status_code == 200
    assert b"thread_id" in res.content
    assert THREAD_ID.encode() in res.content
    assert b"done" in res.content
    ws_service.get_workspace.assert_awaited_once_with(OWNER_ID, WORKSPACE_ID)
    t_service.create_thread.assert_awaited_once_with(WORKSPACE_ID)
    t_service.mark_active.assert_awaited_once_with(THREAD_ID)


def test_chat_stream_success_existing_thread():
    ws_service = AsyncMock()
    now = datetime.now(timezone.utc)
    ws_service.get_workspace.return_value = WorkspaceRead(
        id=WORKSPACE_ID,
        name="Wishlist",
        description="original",
        created_at=now,
        updated_at=now,
        stats=WorkspaceStats(),
    )

    t_service = AsyncMock()
    t_service.get_thread.return_value = ThreadRead(
        thread_id=THREAD_ID,
        workspace_id=WORKSPACE_ID,
        title="Existing chat",
        created_at=now,
        updated_at=now,
    )

    agent = AsyncMock()
    agent.get_pending_interrupt.return_value = None
    async def fake_astream(*args, **kwargs):
        yield b'{"type": "done"}\n'
    agent.astream = fake_astream

    c = _make_client(ws_service, agent, t_service)

    res = c.post(
        "/chat/stream",
        json={
            "messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}],
            "workspace_id": WORKSPACE_ID,
            "thread_id": THREAD_ID,
        },
    )
    assert res.status_code == 200
    assert b"thread_id" in res.content
    assert THREAD_ID.encode() in res.content
    t_service.get_thread.assert_awaited_once_with(THREAD_ID, WORKSPACE_ID)


def test_chat_stream_thread_not_found():
    ws_service = AsyncMock()
    now = datetime.now(timezone.utc)
    ws_service.get_workspace.return_value = WorkspaceRead(
        id=WORKSPACE_ID,
        name="Wishlist",
        description="original",
        created_at=now,
        updated_at=now,
        stats=WorkspaceStats(),
    )

    t_service = AsyncMock()
    t_service.get_thread.side_effect = ThreadNotFoundError()

    agent = AsyncMock()
    c = _make_client(ws_service, agent, t_service)

    res = c.post(
        "/chat/stream",
        json={
            "messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}],
            "workspace_id": WORKSPACE_ID,
            "thread_id": "invalid-thread",
        },
    )
    assert res.status_code == 404
    assert "Thread not found" in res.json()["detail"]


def test_chat_stream_workspace_not_found():
    ws_service = AsyncMock()
    ws_service.get_workspace.side_effect = WorkspaceNotFoundError()

    agent = AsyncMock()
    c = _make_client(ws_service, agent)

    res = c.post(
        "/chat/stream",
        json={
            "messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}],
            "workspace_id": WORKSPACE_ID,
        },
    )
    assert res.status_code == 404
    assert "Workspace not found" in res.json()["detail"]
    ws_service.get_workspace.assert_awaited_once_with(OWNER_ID, WORKSPACE_ID)

