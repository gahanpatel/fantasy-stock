from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.config import supabase
from app.auth import get_current_user

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])


class QuestionnaireResponse(BaseModel):
    risk_tolerance: str        # very_conservative, conservative, moderate, aggressive
    experience_years: int      # 0, 1, 5, 10
    time_horizon: str          # short, medium, long
    portfolio_preference: str  # conservative, balanced, growth, aggressive
    loss_tolerance: str        # sell, hold, buy, ignore


def calculate_risk_score(r: QuestionnaireResponse) -> int:
    score = 0
    score += {"very_conservative": 10, "conservative": 20, "moderate": 35, "aggressive": 50}.get(r.risk_tolerance, 25)
    score += {0: 5, 1: 10, 5: 20, 10: 30}.get(r.experience_years, 15)
    score += {"short": 10, "medium": 20, "long": 35}.get(r.time_horizon, 20)
    score += {"conservative": 10, "balanced": 20, "growth": 30, "aggressive": 40}.get(r.portfolio_preference, 20)
    score += {"sell": 5, "hold": 15, "buy": 25, "ignore": 30}.get(r.loss_tolerance, 15)
    MAX_POSSIBLE = 185
    return round((score / MAX_POSSIBLE) * 100)


def determine_strategy(score: int, experience: int) -> str:
    if experience <= 1 or score < 30:
        return "Passive"
    elif score >= 65:
        return "Active"
    else:
        return "Smart Beta"


def determine_style(r: QuestionnaireResponse, score: int) -> str:
    if r.time_horizon == "short" and r.loss_tolerance in ["sell", "hold"]:
        return "Income"
    elif r.time_horizon == "long" and score >= 70:
        return "Growth"
    elif r.time_horizon == "long" and score < 40:
        return "Value"
    elif r.loss_tolerance in ["buy", "ignore"] and score >= 50:
        return "Momentum"
    else:
        return "GARP"


def build_profile_summary(score: int, strategy: str, style: str) -> dict:
    risk_label = (
        "Conservative" if score < 30 else
        "Moderate" if score < 55 else
        "Aggressive" if score < 75 else
        "Very Aggressive"
    )
    descriptions = {
        ("Passive", "Income"):      "You prefer stability. Low-cost ETFs and dividend stocks are your best fit.",
        ("Passive", "Value"):       "You are patient and cautious. Index funds with value tilt suit you well.",
        ("Passive", "GARP"):        "You want steady growth without much risk. Balanced index funds are ideal.",
        ("Smart Beta", "GARP"):     "You want more than passive but less than active. Factor ETFs are your sweet spot.",
        ("Smart Beta", "Value"):    "You believe in fundamentals. Value-factor ETFs and blue chips suit you.",
        ("Smart Beta", "Momentum"): "You like riding trends without full active management. Momentum ETFs fit well.",
        ("Active", "Growth"):       "You are a growth hunter. High-conviction stock picks in tech and innovation.",
        ("Active", "Momentum"):     "You move fast and follow trends. Active trading with stop-losses is your game.",
        ("Active", "GARP"):         "You want growth but at fair prices. Stock picking with P/E discipline.",
    }
    description = descriptions.get(
        (strategy, style),
        f"You are a {risk_label} investor using a {strategy} strategy with a {style} style."
    )
    return {"risk_label": risk_label, "description": description}


@router.get("/questions")
def get_questions():
    return {
        "questions": [
            {
                "id": 1,
                "text": "How do you feel about market volatility?",
                "type": "risk_tolerance",
                "options": ["Very uncomfortable", "Somewhat uncomfortable", "Comfortable", "Very comfortable"],
                "values": ["very_conservative", "conservative", "moderate", "aggressive"]
            },
            {
                "id": 2,
                "text": "How many years have you been investing?",
                "type": "experience_years",
                "options": ["Less than 1 year", "1-5 years", "5-10 years", "10+ years"],
                "values": [0, 1, 5, 10]
            },
            {
                "id": 3,
                "text": "When do you plan to use this money?",
                "type": "time_horizon",
                "options": ["Less than 1 year", "1-5 years", "5+ years"],
                "values": ["short", "medium", "long"]
            },
            {
                "id": 4,
                "text": "What investment style appeals to you?",
                "type": "portfolio_preference",
                "options": ["Conservative", "Balanced", "Growth", "Aggressive"],
                "values": ["conservative", "balanced", "growth", "aggressive"]
            },
            {
                "id": 5,
                "text": "If your portfolio dropped 20%, you would:",
                "type": "loss_tolerance",
                "options": ["Sell immediately", "Hold and wait", "Buy more", "Ignore it"],
                "values": ["sell", "hold", "buy", "ignore"]
            }
        ]
    }


@router.get("/status")
def get_status(user_id: str = Depends(get_current_user)):
    result = supabase.table("investor_profiles").select("id").eq("user_id", user_id).execute()
    return {"completed": len(result.data) > 0}


@router.post("/submit")
def submit_questionnaire(response: QuestionnaireResponse, user_id: str = Depends(get_current_user)):
    score    = calculate_risk_score(response)
    strategy = determine_strategy(score, response.experience_years)
    style    = determine_style(response, score)
    summary  = build_profile_summary(score, strategy, style)

    supabase.table("investor_profiles").upsert({
        "user_id":             user_id,
        "risk_tolerance":      response.risk_tolerance,
        "experience_years":    response.experience_years,
        "time_horizon":        response.time_horizon,
        "portfolio_preference": response.portfolio_preference,
        "loss_tolerance":      response.loss_tolerance,
        "risk_score":          score,
        "strategy":            strategy,
        "style":               style,
        "risk_label":          summary["risk_label"],
        "description":         summary["description"],
    }, on_conflict="user_id").execute()

    return {
        "risk_score":  score,
        "strategy":    strategy,
        "style":       style,
        "risk_label":  summary["risk_label"],
        "description": summary["description"],
    }


@router.get("/profile")
def get_profile(user_id: str = Depends(get_current_user)):
    result = supabase.table("investor_profiles").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Investor profile not found")
    return result.data[0]
