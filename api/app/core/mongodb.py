from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.app_config import app_config

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized")
    return _client


async def connect() -> None:
    global _client
    _client = AsyncIOMotorClient(app_config.mongodb_uri)
    db = _client[app_config.mongodb_db_name]
    await db["users"].create_index("email", unique=True)


async def disconnect() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def get_db() -> AsyncIOMotorDatabase:
    return get_client()[app_config.mongodb_db_name]
