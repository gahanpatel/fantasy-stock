from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.config import get_supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/trading", tags=["trading"])


class TradeRequest(BaseModel):
    ticker: str
    quantity: int


def get_price_cents(ticker: str) -> int:
    try:
        price = yf.Ticker(ticker).fast_info.last_price
    except Exception:
        price = None
    if not price:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")
    return int(round(price * 100))


@router.post("/buy")
async def buy(request: TradeRequest, user_id: str = Depends(get_current_user)):
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    supabase = await get_supabase()
    ticker = request.ticker.upper()
    price_cents = get_price_cents(ticker)
    total_cost_cents = int(round(price_cents * request.quantity))

    user_result = await supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash_cents = user_result.data[0]["cash_balance"]

    if cash_cents < total_cost_cents:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Need ${total_cost_cents/100:.2f}, have ${cash_cents/100:.2f}")

    position_result = await supabase.table("positions").select("*").eq("user_id", user_id).eq("ticker", ticker).execute()

    if position_result.data:
        existing = position_result.data[0]
        new_qty = existing["quantity"] + request.quantity
        new_avg_cents = int(round((existing["average_cost"] * existing["quantity"] + total_cost_cents) / new_qty))
        await supabase.table("positions").update({
            "quantity": int(new_qty),
            "average_cost": new_avg_cents
        }).eq("user_id", user_id).eq("ticker", ticker).execute()
    else:
        await supabase.table("positions").insert({
            "user_id": user_id,
            "ticker": ticker,
            "quantity": request.quantity,
            "average_cost": price_cents
        }).execute()

    await supabase.table("users").update({"cash_balance": cash_cents - total_cost_cents}).eq("id", user_id).execute()
    await supabase.table("trades").insert({
        "user_id": user_id,
        "ticker": ticker,
        "quantity": request.quantity,
        "price": price_cents,
        "side": "buy",
        "total": total_cost_cents
    }).execute()

    return {
        "message": f"Bought {request.quantity} share(s) of {ticker} at ${price_cents/100:.2f}",
        "total_cost": total_cost_cents / 100,
        "cash_remaining": (cash_cents - total_cost_cents) / 100
    }


@router.post("/sell")
async def sell(request: TradeRequest, user_id: str = Depends(get_current_user)):
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    supabase = await get_supabase()
    ticker = request.ticker.upper()
    price_cents = get_price_cents(ticker)
    total_proceeds_cents = int(round(price_cents * request.quantity))

    position_result = await supabase.table("positions").select("*").eq("user_id", user_id).eq("ticker", ticker).execute()
    if not position_result.data:
        raise HTTPException(status_code=400, detail=f"You don't own any shares of {ticker}")

    existing = position_result.data[0]
    if existing["quantity"] < request.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient shares. Have {existing['quantity']}, trying to sell {request.quantity}")

    new_qty = existing["quantity"] - request.quantity
    if new_qty == 0:
        await supabase.table("positions").delete().eq("user_id", user_id).eq("ticker", ticker).execute()
    else:
        await supabase.table("positions").update({"quantity": int(new_qty)}).eq("user_id", user_id).eq("ticker", ticker).execute()

    user_result = await supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    cash_cents = user_result.data[0]["cash_balance"]
    await supabase.table("users").update({"cash_balance": cash_cents + total_proceeds_cents}).eq("id", user_id).execute()
    await supabase.table("trades").insert({
        "user_id": user_id,
        "ticker": ticker,
        "quantity": request.quantity,
        "price": price_cents,
        "side": "sell",
        "total": total_proceeds_cents
    }).execute()

    return {
        "message": f"Sold {request.quantity} share(s) of {ticker} at ${price_cents/100:.2f}",
        "total_proceeds": total_proceeds_cents / 100,
        "cash_balance": (cash_cents + total_proceeds_cents) / 100
    }
