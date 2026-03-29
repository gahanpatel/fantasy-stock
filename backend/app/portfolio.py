from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def fetch_price(ticker: str) -> float:
    try:
        info = yf.Ticker(ticker).info
        return info.get("regularMarketPrice") or 0.0
    except Exception:
        return 0.0


@router.get("/holdings")
def get_holdings(user_id: str = Depends(get_current_user)):
    positions_result = supabase.table("positions").select("*").eq("user_id", user_id).execute()
    positions = positions_result.data or []

    holdings = []
    for pos in positions:
        current_price = fetch_price(pos["ticker"])
        market_value = current_price * pos["quantity"]
        cost_basis = pos["average_cost"] * pos["quantity"]
        pnl = market_value - cost_basis
        pnl_percent = (pnl / cost_basis * 100) if cost_basis else 0

        holdings.append({
            "ticker": pos["ticker"],
            "quantity": pos["quantity"],
            "average_cost": round(pos["average_cost"], 2),
            "current_price": round(current_price, 2),
            "market_value": round(market_value, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2)
        })

    return {"holdings": holdings}


@router.get("/value")
def get_portfolio_value(user_id: str = Depends(get_current_user)):
    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash = user_result.data[0]["cash_balance"]

    positions_result = supabase.table("positions").select("*").eq("user_id", user_id).execute()
    positions = positions_result.data or []

    holdings_value = sum(fetch_price(pos["ticker"]) * pos["quantity"] for pos in positions)
    total_value = cash + holdings_value

    return {
        "cash": round(cash, 2),
        "holdings_value": round(holdings_value, 2),
        "total_value": round(total_value, 2)
    }


@router.get("/history")
def get_portfolio_history(user_id: str = Depends(get_current_user)):
    snapshots_result = supabase.table("portfolio_snapshots").select("*").eq("user_id", user_id).order("snapshot_date").execute()
    snapshots = snapshots_result.data or []

    return {
        "history": [
            {"snapshot_date": s["snapshot_date"], "total_value": s["total_value"]}
            for s in snapshots
        ]
    }


@router.get("/analytics")
def get_analytics(user_id: str = Depends(get_current_user)):
    # Placeholder — to be filled in once DS team exposes analytics functions
    return {"detail": "Analytics not yet implemented"}
