from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def fetch_price_cents(ticker: str) -> int:
    try:
        info = yf.Ticker(ticker).info
        price = info.get("regularMarketPrice") or 0.0
        return int(round(price * 100))
    except Exception:
        return 0


@router.get("/holdings")
def get_holdings(user_id: str = Depends(get_current_user)):
    positions_result = supabase.table("positions").select("*").eq("user_id", user_id).execute()
    positions = positions_result.data or []

    holdings = []
    for pos in positions:
        price_cents = fetch_price_cents(pos["ticker"])
        market_value_cents = int(round(price_cents * pos["quantity"]))
        cost_basis_cents = int(round(pos["average_cost"] * pos["quantity"]))
        pnl_cents = market_value_cents - cost_basis_cents
        pnl_percent = (pnl_cents / cost_basis_cents * 100) if cost_basis_cents else 0

        holdings.append({
            "ticker": pos["ticker"],
            "quantity": pos["quantity"],
            "average_cost": pos["average_cost"] / 100,
            "current_price": price_cents / 100,
            "market_value": market_value_cents / 100,
            "pnl": pnl_cents / 100,
            "pnl_percent": round(pnl_percent, 2)
        })

    return {"holdings": holdings}


@router.get("/value")
def get_portfolio_value(user_id: str = Depends(get_current_user)):
    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash_cents = user_result.data[0]["cash_balance"]

    positions_result = supabase.table("positions").select("ticker, quantity").eq("user_id", user_id).execute()
    positions = positions_result.data or []

    holdings_cents = int(round(sum(fetch_price_cents(p["ticker"]) * p["quantity"] for p in positions)))
    total_cents = cash_cents + holdings_cents

    return {
        "cash": cash_cents / 100,
        "holdings_value": holdings_cents / 100,
        "total_value": total_cents / 100
    }


@router.get("/history")
def get_portfolio_history(user_id: str = Depends(get_current_user)):
    snapshots_result = supabase.table("portfolio_snapshots").select("*").eq("user_id", user_id).order("snapshot_date").execute()
    snapshots = snapshots_result.data or []

    return {
        "history": [
            {"snapshot_date": s["snapshot_date"], "total_value": s["total_value"] / 100}
            for s in snapshots
        ]
    }


@router.get("/trades")
def get_trades(user_id: str = Depends(get_current_user)):
    result = supabase.table("trades").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    trades = result.data or []
    for t in trades:
        t["price"] = t["price"] / 100
        t["total"] = t["total"] / 100
    return {"trades": trades}


@router.post("/snapshot")
def save_snapshot(user_id: str = Depends(get_current_user)):
    from datetime import date
    total_cents = _compute_total_cents(user_id)
    today = date.today().isoformat()
    _upsert_snapshot(user_id, today, total_cents)
    return {"snapshot_date": today, "total_value": total_cents / 100}


def snapshot_all_users():
    """Called by the daily scheduler — snapshots every user's portfolio."""
    from datetime import date
    today = date.today().isoformat()
    users = supabase.table("users").select("id").execute().data or []
    for user in users:
        uid = user["id"]
        try:
            total_cents = _compute_total_cents(uid)
            _upsert_snapshot(uid, today, total_cents)
        except Exception:
            pass  # don't let one user failure block the rest


def _compute_total_cents(user_id: str) -> int:
    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash_cents = user_result.data[0]["cash_balance"]

    positions = supabase.table("positions").select("ticker, quantity").eq("user_id", user_id).execute().data or []
    holdings_cents = int(round(sum(fetch_price_cents(p["ticker"]) * p["quantity"] for p in positions)))
    return cash_cents + holdings_cents


def _upsert_snapshot(user_id: str, date_str: str, total_cents: int):
    existing = supabase.table("portfolio_snapshots").select("id").eq("user_id", user_id).eq("snapshot_date", date_str).execute()
    if existing.data:
        supabase.table("portfolio_snapshots").update({"total_value": total_cents}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("portfolio_snapshots").insert({
            "user_id": user_id,
            "snapshot_date": date_str,
            "total_value": total_cents
        }).execute()


@router.get("/analytics")
def get_analytics(user_id: str = Depends(get_current_user)):
    return {"detail": "Analytics not yet implemented"}
