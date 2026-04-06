from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
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


@router.post("/adjust-splits")
def adjust_splits(user_id: str = Depends(get_current_user)):
    positions = supabase.table("positions").select("*").eq("user_id", user_id).execute().data or []
    if not positions:
        return {"adjusted": []}

    # Get earliest trade date per ticker so we only look at splits since then
    trades = supabase.table("trades").select("ticker, created_at").eq("user_id", user_id).execute().data or []
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

            splits = yf.Ticker(ticker).splits  # pandas Series indexed by date
            if splits.empty:
                continue

            # Filter splits that occurred after the first trade
            recent_splits = splits[splits.index.date > since_date]
            if recent_splits.empty:
                continue

            # Compound all split ratios together
            total_ratio = 1.0
            for ratio in recent_splits:
                total_ratio *= ratio

            if abs(total_ratio - 1.0) < 0.001:
                continue

            new_quantity = pos["quantity"] * total_ratio
            new_avg_cost = int(round(pos["average_cost"] / total_ratio))

            supabase.table("positions").update({
                "quantity": new_quantity,
                "average_cost": new_avg_cost,
            }).eq("user_id", user_id).eq("ticker", ticker).execute()

            # Also adjust all historical trade records for this ticker
            ticker_trades = supabase.table("trades").select("*").eq("user_id", user_id).eq("ticker", ticker).execute().data or []
            for trade in ticker_trades:
                trade_date = datetime.fromisoformat(trade["created_at"].replace("Z", "+00:00")).date()
                # Only apply splits that happened after this specific trade
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
                supabase.table("trades").update({
                    "quantity": new_trade_qty,
                    "price": new_trade_price,
                    "total": int(round(new_trade_qty * new_trade_price)),
                }).eq("id", trade["id"]).execute()

            adjusted.append({"ticker": ticker, "ratio": total_ratio, "new_quantity": new_quantity, "new_avg_cost": new_avg_cost / 100})
        except Exception:
            continue

    return {"adjusted": adjusted}


@router.get("/analytics")
def get_analytics(user_id: str = Depends(get_current_user)):
    import pandas as pd

    STARTING_CASH = 10_000_000  # $100,000 in cents
    RISK_FREE_ANNUAL = 0.05
    RISK_FREE_DAILY = RISK_FREE_ANNUAL / 252

    # Get all trades ordered by date
    trades_result = supabase.table("trades").select("*").eq("user_id", user_id).order("created_at").execute()
    trades = trades_result.data or []

    if not trades:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    # Get user's current cash
    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    cash_cents = user_result.data[0]["cash_balance"] if user_result.data else STARTING_CASH

    # Get current positions
    positions_result = supabase.table("positions").select("*").eq("user_id", user_id).execute()
    positions = {p["ticker"]: p["quantity"] for p in (positions_result.data or [])}

    if not positions:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    # Find the date range: first trade to today
    first_trade_date = trades[0]["created_at"][:10]
    start_date = pd.Timestamp(first_trade_date)
    end_date = pd.Timestamp.today()

    if (end_date - start_date).days < 5:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    # Download historical close prices for all held tickers
    tickers = list(positions.keys())
    try:
        raw = yf.download(tickers, start=first_trade_date, auto_adjust=True, progress=False)
        if len(tickers) == 1:
            price_df = raw[["Close"]].rename(columns={"Close": tickers[0]})
        else:
            price_df = raw["Close"]
        price_df = price_df.ffill().dropna(how="all")
    except Exception:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    if price_df.empty or len(price_df) < 5:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    # Build daily portfolio value series:
    # For simplicity use current holdings * historical prices + current cash
    portfolio_values = []
    for date, row in price_df.iterrows():
        holdings_value = sum(
            positions.get(t, 0) * (row[t] * 100 if not pd.isna(row.get(t, float("nan"))) else 0)
            for t in tickers
        )
        total = holdings_value + cash_cents
        portfolio_values.append(total)

    if len(portfolio_values) < 5:
        return {"sharpe_ratio": None, "annualized_return": None, "volatility": None}

    # Calculate daily returns
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
