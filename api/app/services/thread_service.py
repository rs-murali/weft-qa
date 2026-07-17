from beanie import PydanticObjectId

from app.models.thread import Thread, ThreadRead
from app.repositories.thread_repository import ThreadRepository


class ThreadNotFoundError(Exception):
    pass


def _to_object_id(workspace_id: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(workspace_id)
    except Exception:
        raise ThreadNotFoundError


class ThreadService:
    def __init__(self, thread_repository: ThreadRepository):
        self._repo = thread_repository

    async def create_thread(
        self, workspace_id: str, title: str = "New chat"
    ) -> ThreadRead:
        thread = Thread.new(
            workspace_id=_to_object_id(workspace_id), title=title
        )
        await self._repo.create(thread)
        return self._to_read(thread)

    async def get_thread(self, thread_id: str, workspace_id: str) -> ThreadRead:
        thread = await self._repo.get_by_thread_id(thread_id)
        if thread is None or str(thread.workspace_id) != workspace_id:
            raise ThreadNotFoundError
        return self._to_read(thread)

    async def list_threads(self, workspace_id: str) -> list[ThreadRead]:
        threads = await self._repo.list_by_workspace(_to_object_id(workspace_id))
        return [self._to_read(t) for t in threads]

    async def mark_active(self, thread_id: str) -> None:
        await self._repo.mark_active(thread_id)

    @staticmethod
    def _to_read(thread: Thread) -> ThreadRead:
        return ThreadRead(
            thread_id=thread.thread_id,
            workspace_id=str(thread.workspace_id),
            title=thread.title,
            created_at=thread.created_at,
            updated_at=thread.updated_at,
        )
