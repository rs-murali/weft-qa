from datetime import timedelta
import pytest
from jose import jwt
from app.core.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.core.app_config import app_config
from fastapi import HTTPException


def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)


def test_verify_wrong_password():
    hashed = hash_password("correct")
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token():
    token = create_access_token("user@example.com")
    subject = decode_access_token(token)
    assert subject == "user@example.com"


def test_token_contains_expected_claims():
    token = create_access_token("user@example.com")
    payload = jwt.decode(token, app_config.jwt_secret, algorithms=[ALGORITHM])
    assert payload["sub"] == "user@example.com"
    assert "exp" in payload


def test_expired_token_raises_401():
    from datetime import datetime, timezone
    payload = {
        "sub": "user@example.com",
        "exp": datetime(2000, 1, 1, tzinfo=timezone.utc),
    }
    expired_token = jwt.encode(payload, app_config.jwt_secret, algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_invalid_token_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("not.a.valid.token")
    assert exc_info.value.status_code == 401
