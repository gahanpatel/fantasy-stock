# Copilot Instructions for Fantasy Stock League (Backend)

## 🧠 Big Picture
- The backend is a **FastAPI** app under `backend/app/`. It is intended to power a fantasy stock trading UI (likely Next.js) via REST endpoints.
- Core responsibilities are: **auth**, **portfolio/trading logic**, **price updates**, and **leaderboard ranking**.
- Persistence is handled via **Supabase** (PostgreSQL + auth) using the `supabase` Python client. Connection config lives in `backend/app/config.py`.

## ⚙️ How to Run (Dev)
- Copy `.env.example` (if exists) to `.env` and set:
  - `SUPABASE_URL`, `SUPABASE_KEY`
  - `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRATION_MINUTES`
  - `STARTING_CASH` (default `100000`)
- Install dependencies:
  - `pip install -r backend/requirements.txt`
- Start the server:
  - `uvicorn app.main:app --reload --reload-dir backend/app --port 8000`

## 🔎 Key Files & Patterns
- `backend/app/main.py` is the FastAPI app entrypoint.
  - It should import `FastAPI` and `CORSMiddleware` explicitly (currently uses `fastapi` module import style).
- `backend/app/config.py` loads env vars via `python-dotenv` and creates a Supabase client.
- All other modules (`auth.py`, `market.py`, `portfolio.py`, `trading.py`, `leaderboard.py`) are currently stubs; new endpoints / business logic should be added here.

## 🧩 Integration Points
- **Supabase** is the single source of truth. Use `config.supabase` to query/insert/update rows.
- **JWT auth** values are controlled via env vars (see `JWT_SECRET` and `JWT_ALGORITHM`).
- **Price updates** likely need a scheduler/cron (outside of current code) to refresh portfolio valuations.

## 🛠️ Conventions & Expectations
- Keep API routes organized by domain (e.g., `/trades`, `/portfolio`, `/leaderboard`).
- Use Pydantic models for request/response validation (FastAPI standard).
- Avoid hardcoding secrets; always read from `config.py` or env.
- Ensure CORS is wide open for frontend development, but lock down origins in production.

## 🧪 Tests & CI
- There are no tests in the repo yet; add `pytest` and create a `tests/` folder if you add coverage.
- For local safety, mock Supabase calls (or use a local Supabase emulator) when testing.

---

✅ **Next step:** If any of the above sections feel incomplete or incorrect (e.g. specific endpoints expected by the frontend), let me know and I can refine the instructions with more targeted details.