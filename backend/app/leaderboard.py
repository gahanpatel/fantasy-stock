from fastapi import APIRouter, Depends
from app.config import supabase
from app.auth import get_current_user
from app.portfolio import fetch_price_cents

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(user_id: str = Depends(get_current_user)):
    users_result = supabase.table("users").select("id, display_name, cash_balance").execute()
    TEST_NAMES = {"test", "api test", "apitest"}
    users = [u for u in (users_result.data or []) if u.get("display_name", "").strip().lower() not in TEST_NAMES]

    rankings = []
    for user in users:
        positions = supabase.table("positions").select("ticker, quantity").eq("user_id", user["id"]).execute().data or []
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

    return {"leaderboard": rankings}
