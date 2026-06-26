from pathlib import Path
from dependency_injector import containers, providers
from .llm import get_llm
from .prompt_loader import load_prompt
from app.agents.test_gen.utils.nodes import Nodes
from app.agents.test_gen.agent import TestGenAgent

_AGENTS_DIR = Path(__file__).parent.parent / "agents"


class Container(containers.DeclarativeContainer):

    llm = providers.Singleton(get_llm)

    test_gen_system_prompt = providers.Singleton(
        load_prompt,
        path=_AGENTS_DIR / "test_gen" / "prompts" / "test_gen_system.md",
    )

    test_gen_nodes = providers.Singleton(
        Nodes,
        llm=llm,
        system_prompt=test_gen_system_prompt,
    )

    test_gen_agent = providers.Singleton(
        TestGenAgent,
        nodes=test_gen_nodes,
    )
