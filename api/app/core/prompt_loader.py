from pathlib import Path

import yaml
from pydantic import BaseModel


class PromptTemplate(BaseModel):
    system_prompt: str
    user_prompt: str


def load_prompt(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def load_prompt_yaml(path: str | Path) -> PromptTemplate:
    return PromptTemplate(**yaml.safe_load(Path(path).read_text(encoding="utf-8")))
