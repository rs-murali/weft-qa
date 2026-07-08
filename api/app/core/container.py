from pathlib import Path

from beanie import init_beanie
from dependency_injector import containers, providers
from pymongo import AsyncMongoClient

from .app_config import app_config
from .llm import get_llm
from .prompt_loader import load_prompt
from app.agents.test_gen.utils.nodes import Nodes
from app.agents.test_gen.agent import TestGenAgent
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
