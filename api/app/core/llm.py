from langchain_openrouter import ChatOpenRouter
from .app_config import app_config


def get_llm():
    """Get the LLM model."""
    model = ChatOpenRouter(
        model="nvidia/nemotron-3-ultra-550b-a55b:free",
        max_retries=2,
        api_key=app_config.openrouter_api_key,
    )
    return model
