import pandas as pd


def daily_returns(portfolio_values: list) -> pd.Series | dict:
    """
    Calculate daily percentage changes from a series of portfolio values.

    Args:
        portfolio_values: Ordered list of portfolio values (oldest to newest).

    Returns:
        pd.Series of daily returns (as decimals, e.g. 0.02 = 2%),
        or a dict with 'error' on failure.
    """
    if len(portfolio_values) < 2:
        return {"error": "Need at least 2 data points to calculate daily returns"}

    try:
        values = pd.Series(portfolio_values, dtype=float)

        if (values == 0).any():
            return {"error": "Portfolio values must not contain zeros"}

        return values.pct_change().dropna()

    except Exception as e:
        return {"error": str(e)}


def total_return(start_value: float, end_value: float) -> float | dict:
    """
    Calculate total return: (end - start) / start.

    Returns the return as a decimal (e.g. 0.25 = 25%), or a dict with 'error'.
    """
    if start_value == 0:
        return {"error": "Start value must not be zero"}

    try:
        return round((end_value - start_value) / start_value, 6)
    except Exception as e:
        return {"error": str(e)}


def annualized_return(total_ret: float, num_days: int) -> float | dict:
    """
    Convert a total return to an annualized rate.

    Formula: (1 + total_return) ^ (365 / num_days) - 1

    Args:
        total_ret: Total return as a decimal (e.g. 0.25 for 25%).
        num_days:  Number of calendar days the return spans.

    Returns:
        Annualized return as a decimal, or a dict with 'error'.
    """
    if num_days <= 0:
        return {"error": "num_days must be a positive integer"}

    if total_ret <= -1:
        return {"error": "Total return implies a total loss or worse; cannot annualize"}

    try:
        return round((1 + total_ret) ** (365 / num_days) - 1, 6)
    except Exception as e:
        return {"error": str(e)}
