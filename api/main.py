from fastapi import FastAPI
from app.core.container import Container
from app.routers.chat import router as chat_router


def create_app() -> FastAPI:
    container = Container()
    container.wire(modules=["app.routers.chat"])

    app = FastAPI(title="Weft QA API")
    app.container = container
    app.include_router(chat_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
