from dependency_injector.wiring import Provide, inject
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.container import Container
from app.core.security import decode_access_token
from app.models.user import CurrentUser
from app.repositories.user_repository import UserRepository

_bearer = HTTPBearer(auto_error=False)


@inject
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    user_repository: UserRepository = Depends(Provide[Container.user_repository]),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email = decode_access_token(credentials.credentials)
    user = await user_repository.get_by_email(email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return CurrentUser(id=str(user.id), email=user.email)
