from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.config import supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/trading", tags=["trading"])

class TradeRequest(BaseModel):
    ticker: str
    quantity: float


def get_current_price(ticker: str) -> float:
    stock = yf.Ticker(ticker)
    info = stock.info
    price = info.get("regularMarketPrice")
    if price is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")
    return price


@router.post("/buy")
def buy(request: TradeRequest, user_id: str = Depends(get_current_user)):
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    ticker = request.ticker.upper()
    price = get_current_price(ticker)
    total_cost = price * request.quantity

    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    cash = user_result.data[0]["cash_balance"]

    if cash < total_cost:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Need ${total_cost:.2f}, have ${cash:.2f}")

    holding_result = supabase.table("positions").select("*").eq("user_id", user_id).eq("ticker", ticker).execute()

    if holding_result.data:
        existing = holding_result.data[0]
        new_qty = existing["quantity"] + request.quantity
        new_avg = ((existing["average_cost"] * existing["quantity"]) + total_cost) / new_qty
        supabase.table("positions").update({
            "quantity": new_qty,
            "average_cost": new_avg
        }).eq("user_id", user_id).eq("ticker", ticker).execute()
    else:
        supabase.table("positions").insert({
            "user_id": user_id,
            "ticker": ticker,
            "quantity": request.quantity,
            "average_cost": price
        }).execute()

    supabase.table("users").update({"cash_balance": cash - total_cost}).eq("id", user_id).execute()

    supabase.table("trades").insert({
        "user_id": user_id,
        "ticker": ticker,
        "quantity": request.quantity,
        "price": price,
        "side": "buy",
        "total": round(total_cost, 2)
    }).execute()

    return {
        "message": f"Bought {request.quantity} share(s) of {ticker} at ${price:.2f}",
        "total_cost": round(total_cost, 2),
        "cash_remaining": round(cash - total_cost, 2)
    }


@router.post("/sell")
def sell(request: TradeRequest, user_id: str = Depends(get_current_user)):
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    ticker = request.ticker.upper()
    price = get_current_price(ticker)
    total_proceeds = price * request.quantity

    holding_result = supabase.table("positions").select("*").eq("user_id", user_id).eq("ticker", ticker).execute()
    if not holding_result.data:
        raise HTTPException(status_code=400, detail=f"You don't own any shares of {ticker}")

    existing = holding_result.data[0]
    if existing["quantity"] < request.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient shares. Have {existing['quantity']}, trying to sell {request.quantity}")

    new_qty = existing["quantity"] - request.quantity
    if new_qty == 0:
        supabase.table("positions").delete().eq("user_id", user_id).eq("ticker", ticker).execute()
    else:
        supabase.table("positions").update({"quantity": new_qty}).eq("user_id", user_id).eq("ticker", ticker).execute()

    user_result = supabase.table("users").select("cash_balance").eq("id", user_id).execute()
    cash = user_result.data[0]["cash_balance"]
    supabase.table("users").update({"cash_balance": cash + total_proceeds}).eq("id", user_id).execute()

    supabase.table("trades").insert({
        "user_id": user_id,
        "ticker": ticker,
        "quantity": request.quantity,
        "price": price,
        "side": "sell",
        "total": round(total_proceeds, 2)
    }).execute()

    return {
        "message": f"Sold {request.quantity} share(s) of {ticker} at ${price:.2f}",
        "total_proceeds": round(total_proceeds, 2),
        "cash_balance": round(cash + total_proceeds, 2)
    }
