from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter(prefix="/market", tags=["market"])

@router.get("/quote/{ticker}")
def get_quote(ticker: str):
    stock = yf.Ticker(ticker)
    info = stock.info

    if not info or info.get("regularMarketPrice") is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    return {
        "ticker": ticker.upper(),
        "name": info.get("shortName", "Unknown"),
        "price": info.get("regularMarketPrice"),
        "previous_close": info.get("previousClose"),
        "change": round(info.get("regularMarketPrice", 0) - info.get("previousClose", 0), 2),
        "change_percent": round(((info.get("regularMarketPrice", 0) - info.get("previousClose", 0)) / info.get("previousClose", 1)) * 100, 2),
        "volume": info.get("volume"),
        "sector": info.get("sector", "N/A")
    }
