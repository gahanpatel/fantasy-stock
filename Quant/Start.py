import pandas as pd
import numpy as np
import yfinance as yf

def get_current_price(ticker: str) -> dict:
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="2d")

        if hist.empty:
            return {"error": f"Ticker '{ticker}' not found or no data available"}

        latest = hist.iloc[-1]
        previous = hist.iloc[-2]

        current_price = round(latest["Close"], 2)
        prev_price = round(previous["Close"], 2)
        daily_change = round(current_price - prev_price, 2)
        change_pct = round((daily_change / prev_price) * 100, 2)
        volume = int(latest["Volume"])

        return {
            "ticker": ticker.upper(),
            "price": current_price,
            "daily_change": daily_change,
            "change_percent": change_pct,
            "volume": volume
        }

    except Exception as e:
        return {"error": str(e)}

def sharpe_ratio(ann_return: float, volatility: float, risk_free_rate: float = 0.05) -> float:
    if volatility == 0:
        return 0.0
    return round((ann_return - risk_free_rate) / volatility, 4)

def calculate_volatility(portfolio_values: list) -> float:
    # Calculate annualized volatility from a series of portfolio values
    try:
        values = pd.Series(portfolio_values)
        daily_returns = values.pct_change().dropna()

        if len(daily_returns) < 2:
            return {"error": "Not enough data points to calculate volatility"}

        volatility = daily_returns.std() * np.sqrt(252)
        return round(float(volatility), 4)

    except Exception as e:
        return {"error": str(e)}