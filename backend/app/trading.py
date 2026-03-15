from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.config import supabase
from app.auth import get_current_user
import yfinance as yf

router = APIRouter(prefix="/trading", tags=["trading"])

class TradeRequest(BaseModel):
    ticker: str
    quantity: float

    