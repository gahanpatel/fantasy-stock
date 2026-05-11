from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.trading import router as trading_router
from app.market import router as market_router
from app.portfolio import router as portfolio_router
from app.leaderboard import router as leaderboard_router
from app.questionnaire import router as questionnaire_router

app = FastAPI(
    title="FantasyStock API",
    description="Fantasy stock trading platform for TAMID Group",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message" : "FantasyStock API is running"}

app.include_router(auth_router)
app.include_router(trading_router)
app.include_router(market_router)
app.include_router(portfolio_router)
app.include_router(leaderboard_router)
app.include_router(questionnaire_router)