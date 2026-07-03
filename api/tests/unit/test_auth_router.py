from unittest.mock import MagicMock
import pytest
from dependency_injector import providers
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError
from app.core.security import hash_password


def _make_client(mock_db):
    """Return a TestClient with the container's mongo_db provider overridden."""
    from main import app, container

    container.mongo_db.override(providers.Object(mock_db))
    client = TestClient(app, raise_server_exceptions=False)
    return client


@pytest.fixture(autouse=True)
def _clear_overrides():
    from main import container
    yield
    container.mongo_db.reset_override()


def _mock_db():
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)
    return mock_db, mock_collection


# ---------------------------------------------------------------------------
# /auth/register
# ---------------------------------------------------------------------------

def test_register_success():
    mock_db, col = _mock_db()
    col.insert_one = MagicMock(return_value=MagicMock(inserted_id="abc"))
    c = _make_client(mock_db)

    res = c.post("/auth/register", json={"email": "a@example.com", "password": "pass"})
    assert res.status_code == 201
    assert res.json() == {"message": "User created"}


def test_register_duplicate_email():
    mock_db, col = _mock_db()
    col.insert_one = MagicMock(side_effect=DuplicateKeyError("dup"))
    c = _make_client(mock_db)

    res = c.post("/auth/register", json={"email": "a@example.com", "password": "pass"})
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]


def test_register_invalid_email():
    mock_db, _ = _mock_db()
    c = _make_client(mock_db)

    res = c.post("/auth/register", json={"email": "not-an-email", "password": "pass"})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# /auth/login
# ---------------------------------------------------------------------------

def test_login_success():
    mock_db, col = _mock_db()
    hashed = hash_password("mypassword")
    col.find_one = MagicMock(
        return_value={"email": "a@example.com", "hashed_password": hashed}
    )
    c = _make_client(mock_db)

    res = c.post("/auth/login", json={"email": "a@example.com", "password": "mypassword"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password():
    mock_db, col = _mock_db()
    hashed = hash_password("correct")
    col.find_one = MagicMock(
        return_value={"email": "a@example.com", "hashed_password": hashed}
    )
    c = _make_client(mock_db)

    res = c.post("/auth/login", json={"email": "a@example.com", "password": "wrong"})
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]


def test_login_unknown_email():
    mock_db, col = _mock_db()
    col.find_one = MagicMock(return_value=None)
    c = _make_client(mock_db)

    res = c.post("/auth/login", json={"email": "ghost@example.com", "password": "any"})
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]
