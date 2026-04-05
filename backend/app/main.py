from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.auth import router as auth_router
from app.trading import router as trading_router
from app.market import router as market_router
from app.portfolio import router as portfolio_router, snapshot_all_users
from app.leaderboard import router as leaderboard_router

scheduler = BackgroundScheduler()
# Run daily at 9:00 PM UTC (4:00 PM ET, after market close)
scheduler.add_job(snapshot_all_users, "cron", hour=21, minute=0, timezone="UTC")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="FantasyStock API",
    description="Fantasy stock trading platform for TAMID Group",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
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