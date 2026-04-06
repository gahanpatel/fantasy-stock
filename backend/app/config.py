import os
from dotenv import load_dotenv
from supabase import create_client
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "fantasystockleague")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "43200"))  # 30 days
STARTING_CASH = int(os.getenv("STARTING_CASH", "10000000"))  # stored in cents ($100,000.00)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)