-- Run this in your Supabase SQL editor to create the investor_profiles table

CREATE TABLE IF NOT EXISTS investor_profiles (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_tolerance      TEXT NOT NULL,
    experience_years    INTEGER NOT NULL,
    time_horizon        TEXT NOT NULL,
    portfolio_preference TEXT NOT NULL,
    loss_tolerance      TEXT NOT NULL,
    risk_score          INTEGER NOT NULL,
    strategy            TEXT NOT NULL,
    style               TEXT NOT NULL,
    risk_label          TEXT NOT NULL,
    description         TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
