from pathlib import Path

from beanie import init_beanie
from dependency_injector import containers, providers
from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import AsyncMongoClient, MongoClient

from .app_config import app_config
from .llm import get_llm
from .prompt_loader import load_prompt, load_prompt_yaml
from app.agents.test_gen.utils.nodes import Nodes
from app.agents.test_gen.agent import TestGenAgent
from app.agents.weft.utils.nodes import Nodes as WeftNodes
from app.agents.weft.agent import WeftAgent
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.auth_service import AuthService
from app.services.workspace_service import WorkspaceService

_AGENTS_DIR = Path(__file__).parent.parent / "agents"


async def _init_mongo_client(uri: str, db_name: str):
    client = AsyncMongoClient(uri, tz_aware=True)
    await init_beanie(database=client[db_name], document_models=[User, Workspace])
    yield client
    await client.close()


async def _init_checkpointer(uri: str, db_name: str):
    client = MongoClient(uri)
    saver = MongoDBSaver(client, db_name=db_name)
    yield saver
    client.close()


class Container(containers.DeclarativeContainer):

    llm = providers.Singleton(get_llm)

    mongo_client = providers.Resource(
        _init_mongo_client,
        uri=app_config.mongodb_uri,
        db_name=app_config.mongodb_db_name,
    )

    user_repository = providers.Singleton(UserRepository)
    auth_service = providers.Singleton(AuthService, user_repository=user_repository)

    workspace_repository = providers.Singleton(WorkspaceRepository)
    workspace_service = providers.Singleton(
        WorkspaceService, workspace_repository=workspace_repository
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

    checkpointer = providers.Resource(
        _init_checkpointer,
        uri=app_config.mongodb_uri,
        db_name=app_config.mongodb_db_name,
    )

    weft_extract_prompt = providers.Singleton(
        load_prompt_yaml,
        path=_AGENTS_DIR / "weft" / "prompts" / "extract_requirements.yaml",
    )

    weft_test_gen_prompt = providers.Singleton(
        load_prompt_yaml,
        path=_AGENTS_DIR / "weft" / "prompts" / "generate_test_cases.yaml",
    )

    weft_nodes = providers.Singleton(
        WeftNodes,
        llm=llm,
        extract_prompt=weft_extract_prompt,
        test_gen_prompt=weft_test_gen_prompt,
    )

    weft_agent = providers.Singleton(
        WeftAgent,
        nodes=weft_nodes,
        checkpointer=checkpointer,
    )
