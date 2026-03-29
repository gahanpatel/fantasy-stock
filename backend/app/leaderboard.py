from fastapi import APIRouter, Depends
from app.config import supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def fetch_price(ticker: str) -> float:
    try:
        info = yf.Ticker(ticker).info
        return info.get("regularMarketPrice") or 0.0
    except Exception:
        return 0.0


@router.get("")
def get_leaderboard(user_id: str = Depends(get_current_user)):
    users_result = supabase.table("users").select("id, display_name, cash_balance").execute()
    users = users_result.data or []

    rankings = []
    for user in users:
        positions_result = supabase.table("positions").select("ticker, quantity").eq("user_id", user["id"]).execute()
        positions = positions_result.data or []

        holdings_value = sum(fetch_price(pos["ticker"]) * pos["quantity"] for pos in positions)
        total_value = user["cash_balance"] + holdings_value

        rankings.append({
            "user_id": user["id"],
            "display_name": user["display_name"],
            "cash_balance": round(user["cash_balance"], 2),
            "holdings_value": round(holdings_value, 2),
            "total_value": round(total_value, 2)
        })

    rankings.sort(key=lambda x: x["total_value"], reverse=True)
    for i, entry in enumerate(rankings):
        entry["rank"] = i + 1

    return {"leaderboard": rankings}
