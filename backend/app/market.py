from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter(prefix="/market", tags=["market"])

@router.get("/quote/{ticker}")
def get_quote(ticker: str):
    stock = yf.Ticker(ticker)
    info = stock.info

    try:
        price = yf.Ticker(ticker).fast_info.last_price
    except Exception:
        price = None

    if not price:
        raise HTTPException(status_code=404, detail="Stock not found")

    prev_close = info.get("previousClose") or 0
    return {
        "ticker": ticker.upper(),
        "name": info.get("shortName", ticker.upper()),
        "price": round(price, 2),
        "previous_close": prev_close,
        "change": round(price - prev_close, 2),
        "change_percent": round(((price - prev_close) / prev_close) * 100, 2) if prev_close else 0,
        "volume": info.get("volume"),
        "sector": info.get("sector", "N/A")
    }
