from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from dependency_injector.wiring import Provide, inject
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.types import Command
from app.models.chat import ChatRequest
from app.core.container import Container
from app.core.deps import get_current_user
from app.models.user import CurrentUser
from app.agents.weft.agent import WeftAgent, event_line

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


def _resume_payload(request: ChatRequest) -> Command:
    """Translate the wire vocabulary into the graph's. `human_approval` reads
    `regenerate`; the client speaks `approval_status`. Keeping the two apart
    lets either side be renamed without touching the other."""
    if request.approval_status == "approved":
        return Command(resume={"regenerate": False})
    return Command(resume={"regenerate": True, "feedback": request.feedback or ""})


def _start_payload(request: ChatRequest) -> dict:
    return {
        "messages": _to_langchain_messages(request.messages),
        "workspace_id": request.workspace_id,
        "requirements": [],
        "test_cases": [],
        "feedback": "",
    }


def _error_stream(message: str, stage: str | None) -> StreamingResponse:
    return StreamingResponse(
        iter([event_line({"type": "error", "message": message, "stage": stage})]),
        media_type=NDJSON,
    )


@router.post("/stream")
@inject
async def chat_stream(
    request: ChatRequest,
    agent: Annotated[WeftAgent, Depends(Provide[Container.weft_agent])],
    _current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    # One conversation per workspace, so the workspace is the checkpoint thread.
    thread_id = request.workspace_id
    pending = await agent.get_pending_interrupt(thread_id)
    answering_gate = request.approval_status is not None

    # The payload type and the graph's state have to agree. A dict sent at an
    # open gate restarts from START and drops the paused run; a resume sent with
    # no gate open has nothing to resume. Both are reachable from the UI — a
    # message typed while a gate waits, a double-clicked Approve — so neither
    # can be left to LangGraph to interpret.
    if not answering_gate and pending is not None:
        stage = pending.get("stage")
        return _error_stream(
            f"Waiting on a decision at the {stage} gate. "
            "Approve or reject that draft before sending more.",
            stage,
        )

    if answering_gate and pending is None:
        return _error_stream("No draft is waiting for a decision.", None)

    payload = _resume_payload(request) if answering_gate else _start_payload(request)
    return StreamingResponse(agent.astream(thread_id, payload), media_type=NDJSON)
