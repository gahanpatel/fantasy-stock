import time
from fastapi import APIRouter, Depends
from app.config import get_supabase
from app.auth import get_current_user
from app.portfolio import fetch_prices_cents

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

_leaderboard_cache: tuple[dict, float] | None = None
_LEADERBOARD_TTL = 60  # 1 minute


@router.get("")
async def get_leaderboard(user_id: str = Depends(get_current_user)):
    global _leaderboard_cache
    now = time.time()
    if _leaderboard_cache and now - _leaderboard_cache[1] < _LEADERBOARD_TTL:
        print("[cache] leaderboard HIT")
        return _leaderboard_cache[0]
    t0 = time.perf_counter()

    supabase = await get_supabase()
    users_result = await supabase.table("users").select("id, display_name, cash_balance").execute()
    TEST_NAMES = {"test", "api test", "apitest"}
    # display_name is nullable, so coalesce before comparing — .get()'s default
    # does not apply when the key is present with a None value.
    users = [
        u for u in (users_result.data or [])
        if (u.get("display_name") or "").strip().lower() not in TEST_NAMES
    ]

    # One query for every position, then one concurrent price batch. Fetching
    # per user serially blew past Vercel's function timeout.
    all_positions = (await supabase.table("positions").select("user_id, ticker, quantity").execute()).data or []
    positions_by_user: dict[str, list[dict]] = {}
    for p in all_positions:
        positions_by_user.setdefault(p["user_id"], []).append(p)
    prices = await fetch_prices_cents(p["ticker"] for p in all_positions)

    rankings = []
    for user in users:
        positions = positions_by_user.get(user["id"], [])
        holdings_cents = int(round(sum(prices.get(p["ticker"], 0) * p["quantity"] for p in positions)))
        total_cents = user["cash_balance"] + holdings_cents

        rankings.append({
            "user_id": user["id"],
            "display_name": user["display_name"] or "Unnamed player",
            "cash_balance": user["cash_balance"] / 100,
            "holdings_value": holdings_cents / 100,
            "total_value": total_cents / 100
        })

    rankings.sort(key=lambda x: x["total_value"], reverse=True)
    for i, entry in enumerate(rankings):
        entry["rank"] = i + 1

    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(f"[cache] leaderboard MISS fetch={elapsed_ms:.0f}ms")
    result = {"leaderboard": rankings}
    _leaderboard_cache = (result, now)
    return result
