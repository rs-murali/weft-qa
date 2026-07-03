from pathlib import Path
from pymongo import MongoClient
from dependency_injector import containers, providers
from .llm import get_llm
from .prompt_loader import load_prompt
from .app_config import app_config
from app.agents.test_gen.utils.nodes import Nodes
from app.agents.test_gen.agent import TestGenAgent

_AGENTS_DIR = Path(__file__).parent.parent / "agents"


def _init_mongo_client(uri: str, db_name: str):
    client = MongoClient(uri)
    client[db_name]["users"].create_index("email", unique=True)
    yield client
    client.close()


class Container(containers.DeclarativeContainer):

    llm = providers.Singleton(get_llm)

    mongo_client = providers.Resource(
        _init_mongo_client,
        uri=app_config.mongodb_uri,
        db_name=app_config.mongodb_db_name,
    )

    mongo_db = providers.Singleton(
        lambda client: client[app_config.mongodb_db_name],
        client=mongo_client,
    )

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
