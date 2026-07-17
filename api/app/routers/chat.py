from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from dependency_injector.wiring import Provide, inject
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.types import Command
from app.models.chat import ChatRequest
from app.core.container import Container
from app.core.deps import get_current_user
from app.models.user import CurrentUser
from app.agents.weft.agent import WeftAgent, event_line
from app.services.workspace_service import WorkspaceNotFoundError, WorkspaceService
from app.services.thread_service import ThreadNotFoundError, ThreadService

router = APIRouter(prefix="/chat", tags=["chat"])

NDJSON = "application/x-ndjson"


def _to_langchain_messages(messages):
    result = []
    for m in messages:
        text = "".join(c.text for c in m.content if c.type == "text")
        if m.role == "user":
            result.append(HumanMessage(content=text))
        elif m.role == "assistant":
            result.append(AIMessage(content=text))
    return result


def _error_stream(message: str, stage: str | None) -> StreamingResponse:
    return StreamingResponse(
        iter([event_line({"type": "error", "message": message, "stage": stage})]),
        media_type=NDJSON,
    )


async def _resolve_thread(thread_service: ThreadService, request: ChatRequest) -> str:
    if not request.thread_id:
        thread = await thread_service.create_thread(request.workspace_id)
        return thread.thread_id
    try:
        thread = await thread_service.get_thread(request.thread_id, request.workspace_id)
    except ThreadNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found in this workspace",
        )
    return thread.thread_id


def _check_gate_alignment(pending: dict | None, answering_gate: bool) -> StreamingResponse | None:
    """Rejects a message sent while a gate is open, or a decision sent with none
    open. Returns the error response to send, or None if consistent."""
    if not answering_gate and pending is not None:
        stage = pending.get("stage")
        return _error_stream(
            f"Waiting on a decision at the {stage} gate. "
            "Approve or reject that draft before sending more.",
            stage,
        )
    if answering_gate and pending is None:
        return _error_stream("No draft is waiting for a decision.", None)
    return None


@router.post("/stream")
@inject
async def chat_stream(
    request: ChatRequest,
    agent: Annotated[WeftAgent, Depends(Provide[Container.weft_agent])],
    workspace_service: Annotated[WorkspaceService, Depends(Provide[Container.workspace_service])],
    thread_service: Annotated[ThreadService, Depends(Provide[Container.thread_service])],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    # Validate request
    try:
        await workspace_service.get_workspace(current_user.id, request.workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or not owned by current user",
        )
    thread_id = await _resolve_thread(thread_service, request)

    # Determine graph state
    pending = await agent.get_pending_interrupt(thread_id)
    answering_gate = request.approval_status is not None
    gate_error = _check_gate_alignment(pending, answering_gate)
    if gate_error is not None:
        return gate_error

    # Build graph payload
    # `human_approval` reads `regenerate`; the client speaks `approval_status`.
    # Keeping the two apart lets either side be renamed without touching the other.
    if answering_gate:
        payload = Command(
            resume={
                "regenerate": request.approval_status != "approved",
                "feedback": request.feedback or "",
            }
        )
    else:
        payload = {
            "messages": _to_langchain_messages(request.messages),
            "workspace_id": request.workspace_id,
            "requirements": [],
            "test_cases": [],
            "feedback": "",
        }

    # Stream response
    async def _stream():
        yield event_line({"type": "thread_id", "thread_id": thread_id})
        async for chunk in agent.astream(thread_id, payload):
            yield chunk
        await thread_service.mark_active(thread_id)

    return StreamingResponse(_stream(), media_type=NDJSON)
