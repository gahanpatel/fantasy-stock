# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # Dev server (localhost:8000)
```

## Architecture

**TamidTrades** is a fantasy stock trading league. Users trade real tickers with simulated cash, and compete on a leaderboard based on total portfolio value.

### Stack
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS 4), deployed on Vercel
- **Backend**: Python FastAPI, deployed on Railway at `https://successful-quietude-production-2df8.up.railway.app`
- **Database**: Supabase PostgreSQL (UUID PKs, all monetary values stored in **cents as INT**)
- **Stock data**: yfinance (live quotes fetched on demand)

### Request Flow
1. Frontend authenticates via `POST /auth/login` → receives JWT, stored in `localStorage` as `tt_session`
2. All subsequent API calls go to the Railway backend with `Authorization: Bearer <token>`
3. Frontend helper in [src/lib/api.ts](src/lib/api.ts) attaches the token and handles 401s (auto-logout)
4. Live stock quotes are fetched through a Next.js proxy route at `/api/quote/[ticker]` which calls yfinance server-side to avoid CORS

### Monetary Values
All prices, balances, and totals are stored and transmitted in **cents** (e.g., `$100,000.00` = `10000000`). Format with `fmt()` / `fmtPct()` from [src/lib/data.ts](src/lib/data.ts) for display.

### Auth
- Context: [src/context/AuthContext.tsx](src/context/AuthContext.tsx) — wraps the app, exposes `user`, `login()`, `register()`, `logout()`
- Session stored in `localStorage` key `tt_session` as `{ token, name, email }`
- Backend: [backend/app/auth.py](backend/app/auth.py) — bcrypt passwords, HS256 JWT (420 min expiry)
- Protected routes live under `src/app/(app)/` — the layout guard redirects unauthenticated users

### Backend Routers
| Prefix | File | Responsibility |
|---|---|---|
| `/auth` | `backend/app/auth.py` | Register, login, JWT validation |
| `/trading` | `backend/app/trading.py` | Buy/sell shares, update cash & positions |
| `/portfolio` | `backend/app/portfolio.py` | Holdings, P&L, history, daily snapshots |
| `/market` | `backend/app/market.py` | Live quote by ticker |
| `/leaderboard` | `backend/app/leaderboard.py` | Rankings by total portfolio value |
| `/questionnaire` | `backend/app/questionnaire.py` | Risk profile survey, investor classification |

The daily snapshot job (`snapshot_all_users`) runs at 21:00 UTC via APScheduler in `main.py`.

### Database Tables (Supabase)
- `users` — email, password_hash, display_name, cash_balance (cents)
- `positions` — user_id, ticker, quantity, average_cost (cents); unique on (user_id, ticker)
- `trades` — full trade log; side is `'buy'` or `'sell'`
- `portfolio_snapshots` — daily total_value (cents) per user; unique on (user_id, snapshot_date)
- `investor_profiles` — questionnaire responses and derived risk_score / strategy / style

Schema: [supabase/schema.sql](supabase/schema.sql)

### Frontend Route Structure
```
src/app/
├── layout.tsx              # Root layout, mounts AuthProvider
├── page.tsx                # Redirects → /dashboard
├── login/                  # Login + register tabs
├── api/quote/[ticker]/     # Server-side yfinance proxy
└── (app)/                  # Auth-guarded shell with Sidebar
    ├── dashboard/          # Portfolio summary, top holdings, live rank
    ├── portfolio/          # Full holdings with P&L breakdown
    ├── trade/              # Buy/sell interface
    ├── leaderboard/        # Global rankings
    ├── history/            # Trade log + portfolio value chart
    └── questionnaire/      # Risk profile survey
```

`Sidebar.tsx` handles navigation and displays the user's live leaderboard rank.

## Environment Variables

**Backend** (`backend/.env`):
```
SUPABASE_URL=
SUPABASE_KEY=
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=420
STARTING_CASH=10000000
```

**Frontend**: The Railway API URL is hardcoded in [src/lib/api.ts](src/lib/api.ts) as `API_URL`.
