import time
from fastapi import APIRouter, Depends
from app.config import get_supabase
from app.auth import get_current_user
from app.portfolio import fetch_price_cents

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

_leaderboard_cache: tuple[dict, float] | None = None
_LEADERBOARD_TTL = 60  # 1 minute


@router.get("")
async def get_leaderboard(user_id: str = Depends(get_current_user)):
    global _leaderboard_cache
    now = time.time()
    if _leaderboard_cache and now - _leaderboard_cache[1] < _LEADERBOARD_TTL:
        return _leaderboard_cache[0]

    supabase = await get_supabase()
    users_result = await supabase.table("users").select("id, display_name, cash_balance").execute()
    TEST_NAMES = {"test", "api test", "apitest"}
    users = [u for u in (users_result.data or []) if u.get("display_name", "").strip().lower() not in TEST_NAMES]

    rankings = []
    for user in users:
        positions_result = await supabase.table("positions").select("ticker, quantity").eq("user_id", user["id"]).execute()
        positions = positions_result.data or []
        holdings_cents = int(round(sum(fetch_price_cents(p["ticker"]) * p["quantity"] for p in positions)))
        total_cents = user["cash_balance"] + holdings_cents

        rankings.append({
            "user_id": user["id"],
            "display_name": user["display_name"],
            "cash_balance": user["cash_balance"] / 100,
            "holdings_value": holdings_cents / 100,
            "total_value": total_cents / 100
        })

    rankings.sort(key=lambda x: x["total_value"], reverse=True)
    for i, entry in enumerate(rankings):
        entry["rank"] = i + 1

    result = {"leaderboard": rankings}
    _leaderboard_cache = (result, now)
    return result
