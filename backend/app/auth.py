from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.config import get_supabase, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_MINUTES, STARTING_CASH

security = HTTPBearer()
router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(request: RegisterRequest):
    supabase = await get_supabase()
    result = await supabase.table("users").select("*").eq("email", request.email).execute()
    if result.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(request.password)
    await supabase.table("users").insert({
        "email": request.email,
        "password_hash": hashed_password,
        "display_name": request.display_name,
        "cash_balance": STARTING_CASH
    }).execute()
    return {"message": "User registered successfully"}


@router.post("/login")
async def login(request: LoginRequest):
    supabase = await get_supabase()
    result = await supabase.table("users").select("*").eq("email", request.email).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    user = result.data[0]
    if not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token_data = {
        "sub": user["id"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "display_name": user["display_name"]}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
