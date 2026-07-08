from pymongo.errors import DuplicateKeyError

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import TokenResponse, UserCreate
from app.repositories.user_repository import UserRepository


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self._user_repository = user_repository

    async def register(self, body: UserCreate) -> None:
        try:
            await self._user_repository.create(body.email, hash_password(body.password))
        except DuplicateKeyError:
            raise EmailAlreadyRegisteredError

    async def login(self, body: UserCreate) -> TokenResponse:
        user = await self._user_repository.get_by_email(body.email)
        if user is None or not verify_password(body.password, user.hashed_password):
            raise InvalidCredentialsError
        return TokenResponse(access_token=create_access_token(subject=user.email))
