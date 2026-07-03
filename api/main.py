from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.container import Container
from app.routers.chat import router as chat_router
from app.routers.auth import router as auth_router

container = Container()


@asynccontextmanager
async def lifespan(app: FastAPI):
    container.init_resources()
    yield
    container.shutdown_resources()


def create_app() -> FastAPI:
    container.wire(modules=["app.routers.chat", "app.routers.auth"])

    app = FastAPI(title="Weft QA API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.container = container
    app.include_router(auth_router)
    app.include_router(chat_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True, log_level="info")
