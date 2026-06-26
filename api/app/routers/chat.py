from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from dependency_injector.wiring import Provide, inject
from app.models.chat import ChatRequest
from app.core.container import Container
from app.agents.test_gen.agent import TestGenAgent

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
@inject
async def chat_stream(
    request: ChatRequest,
    agent: Annotated[TestGenAgent, Depends(Provide[Container.test_gen_agent])],
):
    async def event_generator():
        async for token in agent.astream(request.message):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
