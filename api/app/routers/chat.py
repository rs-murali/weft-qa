from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from dependency_injector.wiring import Provide, inject
from langchain_core.messages import HumanMessage, AIMessage
from app.models.chat import ChatRequest
from app.core.container import Container
from app.agents.test_gen.agent import TestGenAgent

router = APIRouter(prefix="/chat", tags=["chat"])


def _to_langchain_messages(messages):
    result = []
    for m in messages:
        text = "".join(c.text for c in m.content if c.type == "text")
        if m.role == "user":
            result.append(HumanMessage(content=text))
        elif m.role == "assistant":
            result.append(AIMessage(content=text))
    return result


@router.post("/stream")
@inject
async def chat_stream(
    request: ChatRequest,
    agent: Annotated[TestGenAgent, Depends(Provide[Container.test_gen_agent])],
):
    messages = _to_langchain_messages(request.messages)

    async def event_generator():
        async for token in agent.astream(messages):
            yield token

    return StreamingResponse(event_generator(), media_type="text/plain")
