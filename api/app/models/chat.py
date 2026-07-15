from pydantic import BaseModel
from typing import Literal


class MessageContent(BaseModel):
    type: Literal["text"]
    text: str


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: list[MessageContent]


class ChatRequest(BaseModel):
    messages: list[Message]
    workspace_id: str
    # None starts a run; anything else answers the gate the graph is paused on.
    approval_status: Literal["approved", "rejected"] | None = None
    feedback: str | None = None  # the reject reason, from the approval UI
