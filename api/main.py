from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.container import Container
from app.routers.chat import router as chat_router


def create_app() -> FastAPI:
    container = Container()
    container.wire(modules=["app.routers.chat"])

    app = FastAPI(title="Weft QA API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.container = container
    app.include_router(chat_router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True, log_level="info")
