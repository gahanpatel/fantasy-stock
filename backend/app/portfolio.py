import os
from fastapi import APIRouter, HTTPException, Depends, Request
from app.config import get_supabase
from app.auth import get_current_user
import yfinance as yf
from datetime import datetime, timezone

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def fetch_price_cents(ticker: str) -> int:
    try:
        price = yf.Ticker(ticker).fast_info.last_price
        return int(round(price * 100)) if price else 0
    except Exception:
        return 0


@router.get("/holdings")
async def get_holdings(user_id: str = Depends(get_current_user)):
    supabase = await get_supabase()
    positions_result = await supabase.table("positions").select("*").eq("user_id", user_id).execute()
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
async def get_portfolio_value(user_id: str = Depends(get_current_user)):
    supabase = await get_supabase()
    user_result = await supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash_cents = user_result.data[0]["cash_balance"]

    positions_result = await supabase.table("positions").select("ticker, quantity").eq("user_id", user_id).execute()
    positions = positions_result.data or []

    holdings_cents = int(round(sum(fetch_price_cents(p["ticker"]) * p["quantity"] for p in positions)))
    total_cents = cash_cents + holdings_cents

    return {
        "cash": cash_cents / 100,
        "holdings_value": holdings_cents / 100,
        "total_value": total_cents / 100
    }


@router.get("/history")
async def get_portfolio_history(user_id: str = Depends(get_current_user)):
    supabase = await get_supabase()
    snapshots_result = await supabase.table("portfolio_snapshots").select("*").eq("user_id", user_id).order("snapshot_date").execute()
    snapshots = snapshots_result.data or []

    return {
        "history": [
            {"snapshot_date": s["snapshot_date"], "total_value": s["total_value"] / 100}
            for s in snapshots
        ]
    }


@router.get("/trades")
async def get_trades(user_id: str = Depends(get_current_user)):
    supabase = await get_supabase()
    result = await supabase.table("trades").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    trades = result.data or []
    for t in trades:
        t["price"] = t["price"] / 100
        t["total"] = t["total"] / 100
    return {"trades": trades}


@router.post("/snapshot")
async def save_snapshot(user_id: str = Depends(get_current_user)):
    from datetime import date
    supabase = await get_supabase()
    total_cents = await _compute_total_cents(supabase, user_id)
    today = date.today().isoformat()
    await _upsert_snapshot(supabase, user_id, today, total_cents)
    return {"snapshot_date": today, "total_value": total_cents / 100}


@router.get("/snapshot-all")
async def cron_snapshot_all(request: Request):
    secret = os.getenv("CRON_SECRET", "")
    if secret and request.headers.get("Authorization") != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    await snapshot_all_users()
    return {"ok": True}


async def snapshot_all_users():
    from datetime import date
    supabase = await get_supabase()
    today = date.today().isoformat()
    users = (await supabase.table("users").select("id").execute()).data or []
    for user in users:
        uid = user["id"]
        try:
            total_cents = await _compute_total_cents(supabase, uid)
            await _upsert_snapshot(supabase, uid, today, total_cents)
        except Exception:
            pass


async def _compute_total_cents(supabase, user_id: str) -> int:
    user_result = await supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash_cents = user_result.data[0]["cash_balance"]
    positions = (await supabase.table("positions").select("ticker, quantity").eq("user_id", user_id).execute()).data or []
    holdings_cents = int(round(sum(fetch_price_cents(p["ticker"]) * p["quantity"] for p in positions)))
    return cash_cents + holdings_cents


async def _upsert_snapshot(supabase, user_id: str, date_str: str, total_cents: int):
    existing = await supabase.table("portfolio_snapshots").select("id").eq("user_id", user_id).eq("snapshot_date", date_str).execute()
    if existing.data:
        await supabase.table("portfolio_snapshots").update({"total_value": total_cents}).eq("id", existing.data[0]["id"]).execute()
    else:
        await supabase.table("portfolio_snapshots").insert({
            "user_id": user_id,
            "snapshot_date": date_str,
            "total_value": total_cents
        }).execute()


@router.post("/adjust-splits")
async def adjust_splits(user_id: str = Depends(get_current_user)):
    supabase = await get_supabase()
    positions = (await supabase.table("positions").select("*").eq("user_id", user_id).execute()).data or []
    if not positions:
        return {"adjusted": []}

    trades = (await supabase.table("trades").select("ticker, created_at").eq("user_id", user_id).execute()).data or []
    earliest: dict[str, str] = {}
    for t in trades:
        ticker = t["ticker"]
        if ticker not in earliest or t["created_at"] < earliest[ticker]:
            earliest[ticker] = t["created_at"]

    adjusted = []
    for pos in positions:
        ticker = pos["ticker"]
        try:
            since_str = earliest.get(ticker)
            if not since_str:
                continue
            since_date = datetime.fromisoformat(since_str.replace("Z", "+00:00")).date()

            splits = yf.Ticker(ticker).splits
            if splits.empty:
                continue

            recent_splits = splits[splits.index.date > since_date]
            if recent_splits.empty:
                continue

            total_ratio = 1.0
            for ratio in recent_splits:
                total_ratio *= ratio

            if abs(total_ratio - 1.0) < 0.001:
                continue

            new_quantity = pos["quantity"] * total_ratio
            new_avg_cost = int(round(pos["average_cost"] / total_ratio))

            await supabase.table("positions").update({
                "quantity": new_quantity,
                "average_cost": new_avg_cost,
            }).eq("user_id", user_id).eq("ticker", ticker).execute()

            ticker_trades = (await supabase.table("trades").select("*").eq("user_id", user_id).eq("ticker", ticker).execute()).data or []
            for trade in ticker_trades:
                trade_date = datetime.fromisoformat(trade["created_at"].replace("Z", "+00:00")).date()
                trade_splits = splits[splits.index.date > trade_date]
                if trade_splits.empty:
                    continue
                trade_ratio = 1.0
                for r in trade_splits:
                    trade_ratio *= r
                if abs(trade_ratio - 1.0) < 0.001:
                    continue
                new_trade_qty = trade["quantity"] * trade_ratio
                new_trade_price = int(round(trade["price"] / trade_ratio))
                await supabase.table("trades").update({
                    "quantity": new_trade_qty,
                    "price": new_trade_price,
                    "total": int(round(new_trade_qty * new_trade_price)),
                }).eq("id", trade["id"]).execute()

            adjusted.append({"ticker": ticker, "ratio": total_ratio, "new_quantity": new_quantity, "new_avg_cost": new_avg_cost / 100})
        except Exception:
            continue

    return {"adjusted": adjusted}


@router.get("/analytics")
async def get_analytics(user_id: str = Depends(get_current_user)):
    import pandas as pd

    supabase = await get_supabase()
    STARTING_CASH = 10_000_000
    RISK_FREE_ANNUAL = 0.05
    RISK_FREE_DAILY = RISK_FREE_ANNUAL / 252

    trades_result = await supabase.table("trades").select("*").eq("user_id", user_id).order("created_at").execute()
    trades = trades_result.data or []

    if not trades:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    user_result = await supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    cash_cents = user_result.data[0]["cash_balance"] if user_result.data else STARTING_CASH

    positions_result = await supabase.table("positions").select("*").eq("user_id", user_id).execute()
    positions = {p["ticker"]: p["quantity"] for p in (positions_result.data or [])}

    if not positions:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    first_trade_date = trades[0]["created_at"][:10]
    start_date = pd.Timestamp(first_trade_date)
    end_date = pd.Timestamp.today()

    if (end_date - start_date).days < 1:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    tickers = list(positions.keys())
    try:
        raw = yf.download(tickers, start=first_trade_date, auto_adjust=True, progress=False, group_by="ticker")
        price_df = pd.DataFrame({t: raw[t]["Close"] for t in tickers if t in raw.columns.get_level_values(0)})
        price_df = price_df.ffill().dropna(how="all")
    except Exception:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    if price_df.empty or len(price_df) < 2:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    portfolio_values = []
    for date, row in price_df.iterrows():
        holdings_value = sum(
            positions.get(t, 0) * (row[t] * 100 if t in row and not pd.isna(row[t]) else 0)
            for t in tickers
        )
        total = holdings_value + cash_cents
        portfolio_values.append(total)

    if len(portfolio_values) < 2:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    daily_returns = [
        (portfolio_values[i] - portfolio_values[i - 1]) / portfolio_values[i - 1]
        for i in range(1, len(portfolio_values))
    ]

    n = len(daily_returns)
    mean_r = sum(daily_returns) / n
    variance = sum((r - mean_r) ** 2 for r in daily_returns) / max(n - 1, 1)
    std_dev = variance ** 0.5

    mean_excess = mean_r - RISK_FREE_DAILY
    sharpe = (mean_excess / std_dev) * (252 ** 0.5) if std_dev > 0 else 0

    annualized_return = ((portfolio_values[-1] / portfolio_values[0]) ** (252 / n) - 1) * 100
    annualized_vol = std_dev * (252 ** 0.5) * 100

    return {
        "sharpe_ratio": round(sharpe, 2),
        "annualized_return": round(annualized_return, 2),
        "volatility": round(annualized_vol, 2),
    }
