from unittest.mock import AsyncMock
import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient

from app.models.user import TokenResponse
from app.services.auth_service import EmailAlreadyRegisteredError, InvalidCredentialsError


def _make_client(mock_auth_service):
    """Return a TestClient with the container's auth_service provider overridden."""
    from main import app, container

    container.auth_service.override(providers.Object(mock_auth_service))
    client = TestClient(app, raise_server_exceptions=False)
    return client


@pytest.fixture(autouse=True)
def _clear_overrides():
    from main import container
    yield
    container.auth_service.reset_override()


def _mock_auth_service():
    return AsyncMock()


# ---------------------------------------------------------------------------
# /auth/register
# ---------------------------------------------------------------------------

def test_register_success():
    service = _mock_auth_service()
    service.register.return_value = None
    c = _make_client(service)

    res = c.post("/auth/register", json={"email": "a@example.com", "password": "pass"})
    assert res.status_code == 201
    assert res.json() == {"message": "User created"}


def test_register_duplicate_email():
    service = _mock_auth_service()
    service.register.side_effect = EmailAlreadyRegisteredError()
    c = _make_client(service)

    res = c.post("/auth/register", json={"email": "a@example.com", "password": "pass"})
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]


def test_register_invalid_email():
    service = _mock_auth_service()
    c = _make_client(service)

    res = c.post("/auth/register", json={"email": "not-an-email", "password": "pass"})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# /auth/login
# ---------------------------------------------------------------------------

def test_login_success():
    service = _mock_auth_service()
    service.login.return_value = TokenResponse(access_token="fake-token")
    c = _make_client(service)

    res = c.post("/auth/login", json={"email": "a@example.com", "password": "mypassword"})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"] == "fake-token"
    assert body["token_type"] == "bearer"


def test_login_wrong_password():
    service = _mock_auth_service()
    service.login.side_effect = InvalidCredentialsError()
    c = _make_client(service)

    res = c.post("/auth/login", json={"email": "a@example.com", "password": "wrong"})
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]


def test_login_unknown_email():
    service = _mock_auth_service()
    service.login.side_effect = InvalidCredentialsError()
    c = _make_client(service)

    res = c.post("/auth/login", json={"email": "ghost@example.com", "password": "any"})
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]
