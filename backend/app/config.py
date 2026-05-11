import os
from dotenv import load_dotenv
from supabase import AsyncClient, acreate_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "fantasystockleague")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "43200"))
STARTING_CASH = int(os.getenv("STARTING_CASH", "10000000"))

_supabase: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    global _supabase
    if _supabase is None:
        _supabase = await acreate_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase
