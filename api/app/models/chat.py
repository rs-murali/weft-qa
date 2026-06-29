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
