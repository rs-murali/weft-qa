from fastapi import APIRouter, Depends, HTTPException, status
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.models.user import TokenResponse, UserCreate
from app.services.auth_service import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
@inject
async def register(
    body: UserCreate, auth_service: AuthService = Depends(Provide[Container.auth_service])
):
    try:
        await auth_service.register(body)
    except EmailAlreadyRegisteredError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    return {"message": "User created"}


@router.post("/login", response_model=TokenResponse)
@inject
async def login(
    body: UserCreate, auth_service: AuthService = Depends(Provide[Container.auth_service])
):
    try:
        return await auth_service.login(body)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
