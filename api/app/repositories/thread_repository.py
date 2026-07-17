from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.thread import Thread


class ThreadRepository:
    async def create(self, thread: Thread) -> Thread:
        await thread.insert()
        return thread

    async def get_by_thread_id(self, thread_id: str) -> Thread | None:
        return await Thread.find_one(Thread.thread_id == thread_id)

    async def list_by_workspace(
        self, workspace_id: PydanticObjectId
    ) -> list[Thread]:
        return await (
            Thread.find(Thread.workspace_id == workspace_id)
            .sort(-Thread.updated_at)
            .to_list()
        )

    async def save(self, thread: Thread) -> Thread:
        await thread.save()
        return thread

    async def mark_active(self, thread_id: str) -> None:
        await Thread.find_one(Thread.thread_id == thread_id).set(
            {Thread.updated_at: datetime.now(timezone.utc)}
        )
