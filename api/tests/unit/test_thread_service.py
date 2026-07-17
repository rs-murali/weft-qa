from unittest.mock import AsyncMock, patch
import pytest
from beanie import PydanticObjectId

from app.models.thread import Thread
from app.services.thread_service import ThreadService, ThreadNotFoundError


@pytest.mark.asyncio
async def test_create_thread():
    repo = AsyncMock()
    service = ThreadService(repo)

    workspace_id = "64" + "b" * 22
    thread_read = await service.create_thread(workspace_id, "Custom title")

    assert thread_read.workspace_id == workspace_id
    assert thread_read.title == "Custom title"
    assert len(thread_read.thread_id) > 0
    repo.create.assert_awaited_once()
    created_thread = repo.create.call_args[0][0]
    assert isinstance(created_thread, Thread)
    assert str(created_thread.workspace_id) == workspace_id
    assert created_thread.title == "Custom title"


@pytest.mark.asyncio
async def test_get_thread_success():
    repo = AsyncMock()
    service = ThreadService(repo)

    workspace_id = "64" + "b" * 22
    thread_id = "uuid-123"
    mock_thread = Thread.model_construct(
        thread_id=thread_id,
        workspace_id=PydanticObjectId(workspace_id),
        title="My Thread",
    )
    repo.get_by_thread_id.return_value = mock_thread

    res = await service.get_thread(thread_id, workspace_id)
    assert res.thread_id == thread_id
    assert res.workspace_id == workspace_id
    assert res.title == "My Thread"
    repo.get_by_thread_id.assert_awaited_once_with(thread_id)


@pytest.mark.asyncio
async def test_get_thread_not_found():
    repo = AsyncMock()
    service = ThreadService(repo)
    repo.get_by_thread_id.return_value = None

    with pytest.raises(ThreadNotFoundError):
        await service.get_thread("uuid-123", "64" + "b" * 22)


@pytest.mark.asyncio
async def test_get_thread_workspace_mismatch():
    repo = AsyncMock()
    service = ThreadService(repo)

    mock_thread = Thread.model_construct(
        thread_id="uuid-123",
        workspace_id=PydanticObjectId("64" + "b" * 22),
        title="My Thread",
    )
    repo.get_by_thread_id.return_value = mock_thread

    with pytest.raises(ThreadNotFoundError):
        await service.get_thread("uuid-123", "64" + "c" * 22)


@pytest.mark.asyncio
async def test_list_threads():
    repo = AsyncMock()
    service = ThreadService(repo)

    workspace_id = "64" + "b" * 22
    mock_threads = [
        Thread.model_construct(thread_id="t1", workspace_id=PydanticObjectId(workspace_id), title="Chat 1"),
        Thread.model_construct(thread_id="t2", workspace_id=PydanticObjectId(workspace_id), title="Chat 2"),
    ]
    repo.list_by_workspace.return_value = mock_threads

    res = await service.list_threads(workspace_id)
    assert len(res) == 2
    assert res[0].thread_id == "t1"
    assert res[1].thread_id == "t2"
    repo.list_by_workspace.assert_awaited_once_with(PydanticObjectId(workspace_id))


@pytest.mark.asyncio
async def test_mark_active():
    repo = AsyncMock()
    service = ThreadService(repo)

    await service.mark_active("uuid-123")
    repo.mark_active.assert_awaited_once_with("uuid-123")


@pytest.mark.asyncio
async def test_create_thread_invalid_workspace_id():
    repo = AsyncMock()
    service = ThreadService(repo)

    with pytest.raises(ThreadNotFoundError):
        await service.create_thread("not-an-object-id")


@pytest.mark.asyncio
async def test_list_threads_invalid_workspace_id():
    repo = AsyncMock()
    service = ThreadService(repo)

    with pytest.raises(ThreadNotFoundError):
        await service.list_threads("not-an-object-id")
