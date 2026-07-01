from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from app.core.mongodb import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import TokenResponse, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = {
        "email": body.email,
        "hashed_password": hash_password(body.password),
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await db["users"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    return {"message": "User created"}


@router.post("/login", response_model=TokenResponse)
async def login(body: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one({"email": body.email})
    if user is None or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user["email"])
    return TokenResponse(access_token=token)
