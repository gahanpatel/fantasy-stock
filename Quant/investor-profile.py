from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class QuestionnaireResponse(BaseModel):
    user_id: int
    risk_tolerance: str       # very_conservative, conservative, moderate, aggressive
    experience_years: int     # 0, 1, 5, 10
    time_horizon: str         # short, medium, long
    portfolio_preference: str # conservative, balanced, growth, aggressive
    loss_tolerance: str       # sell, hold, buy, ignore

# -------------------------------------------------------
# Risk Score (0-100)
# -------------------------------------------------------
def calculate_risk_score(r) -> int:
    score = 0
    score += {"very_conservative": 10, "conservative": 20, "moderate": 35, "aggressive": 50}.get(r.risk_tolerance, 25)
    score += {0: 5, 1: 10, 5: 20, 10: 30}.get(r.experience_years, 15)
    score += {"short": 10, "medium": 20, "long": 35}.get(r.time_horizon, 20)
    score += {"conservative": 10, "balanced": 20, "growth": 30, "aggressive": 40}.get(r.portfolio_preference, 20)
    score += {"sell": 5, "hold": 15, "buy": 25, "ignore": 30}.get(r.loss_tolerance, 15)
    return min(score, 100)

# -------------------------------------------------------
# Strategy: Passive, Active, Smart Beta
# -------------------------------------------------------
def determine_strategy(score: int, experience: int) -> str:
    if experience <= 1 or score < 30:
        return "Passive"          # low experience or very risk averse → index funds, ETFs
    elif score >= 65:
        return "Active"           # high risk score → stock picking, frequent trading
    else:
        return "Smart Beta"       # middle ground → factor-based ETFs

# -------------------------------------------------------
# Style: Growth, Value, Income, GARP, Momentum
# -------------------------------------------------------
def determine_style(r, score: int) -> str:
    if r.time_horizon == "short" and r.loss_tolerance in ["sell", "hold"]:
        return "Income"           # wants stability and short term → dividends, bonds
    elif r.time_horizon == "long" and score >= 70:
        return "Growth"           # long term + high risk → high growth stocks
    elif r.time_horizon == "long" and score < 40:
        return "Value"            # long term + low risk → undervalued stocks
    elif r.loss_tolerance in ["buy", "ignore"] and score >= 50:
        return "Momentum"         # buys dips, ignores drops → momentum trading
    else:
        return "GARP"             # Growth At Reasonable Price → balanced default

# -------------------------------------------------------
# Profile Summary based on all 3 variables
# -------------------------------------------------------
def build_profile_summary(score: int, strategy: str, style: str) -> dict:
    
    risk_label = (
        "Conservative" if score < 30 else
        "Moderate" if score < 55 else
        "Aggressive" if score < 75 else
        "Very Aggressive"
    )

    descriptions = {
        ("Passive", "Income"):       "You prefer stability. Low-cost ETFs and dividend stocks are your best fit.",
        ("Passive", "Value"):        "You are patient and cautious. Index funds with value tilt suit you well.",
        ("Passive", "GARP"):         "You want steady growth without much risk. Balanced index funds are ideal.",
        ("Smart Beta", "GARP"):      "You want more than passive but less than active. Factor ETFs are your sweet spot.",
        ("Smart Beta", "Value"):     "You believe in fundamentals. Value-factor ETFs and blue chips suit you.",
        ("Smart Beta", "Momentum"):  "You like riding trends without full active management. Momentum ETFs fit well.",
        ("Active", "Growth"):        "You are a growth hunter. High-conviction stock picks in tech and innovation.",
        ("Active", "Momentum"):      "You move fast and follow trends. Active trading with stop-losses is your game.",
        ("Active", "GARP"):          "You want growth but at fair prices. Stock picking with P/E discipline.",
    }

    description = descriptions.get(
        (strategy, style),
        f"You are a {risk_label} investor using a {strategy} strategy with a {style} style."
    )

    return {
        "risk_label": risk_label,
        "description": description
    }

# -------------------------------------------------------
# Main Endpoint
# -------------------------------------------------------
@app.post("/questionnaire/submit")
async def submit_questionnaire(response: QuestionnaireResponse):
    score    = calculate_risk_score(response)
    strategy = determine_strategy(score, response.experience_years)
    style    = determine_style(response, score)
    summary  = build_profile_summary(score, strategy, style)

    return {
        "user_id":    response.user_id,
        "risk_score": score,
        "strategy":   strategy,
        "style":      style,
        "risk_label": summary["risk_label"],
        "description": summary["description"]
    }

# -------------------------------------------------------
# Questions Endpoint
# -------------------------------------------------------
@app.get("/questionnaire/questions")
async def get_questions():
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