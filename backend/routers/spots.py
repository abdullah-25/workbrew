import os
import json
import time
import re
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from services.reviews import prepare_reviews_for_prompt

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://workbrew:workbrew@127.0.0.1:5433/workbrew",
)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

router = APIRouter()
_gemini_client = None
_last_gemini_call = 0.0


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


class UserPreferences(BaseModel):
    work_type: str = "Mixed"
    noise_preference: str = "No preference"
    session_length: str = "Half day (2-4hrs)"
    must_haves: list[str] = []


class RecommendRequest(BaseModel):
    query: str
    preferences: UserPreferences | None = None


RECOMMEND_PROMPT = """You are a Toronto cafe recommendation engine for remote workers.

{profile_section}

CAFE DATABASE:
{cafes_json}

USER REQUEST: "{query}"

Return ONLY valid JSON — an array of exactly 5 objects, ranked best match first:
[{{"id": "<cafe id>", "reasoning": "<1 sentence explaining why this cafe matches, under 120 chars>"}}]

Rules:
- Reasoning must be specific to the user's request and profile, not generic
- Reference actual scores or attributes from the data
- If the request mentions noise/quiet, weight noise_score heavily
- If the request mentions wifi/internet, weight wifi_score heavily
- If the request mentions long sessions/hours, weight longevity_score heavily
- If the request mentions meetings/calls, consider noise and wifi together
- Weight your ranking toward the user's profile preferences first, then refine by their specific request
- Keep each reasoning under 120 characters
"""


def wifi_label(score: float | None) -> str:
    if score is None or score == 5:
        return "Unknown"
    if score >= 8:
        return "Fast"
    if score >= 6:
        return "Reliable"
    if score >= 3:
        return "Slow"
    return "None"


def noise_label(score: float | None) -> str:
    if score is None:
        return "Moderate"
    if score >= 8:
        return "Quiet"
    if score >= 5:
        return "Moderate"
    if score >= 2:
        return "Loud"
    return "Very Loud"


def outlet_label(score: float | None) -> str:
    if score is None or score == 5:
        return "Average"
    if score >= 8:
        return "Plentiful"
    if score >= 6:
        return "Average"
    if score >= 3:
        return "Limited"
    return "None"


def extract_neighborhood(address: str) -> str:
    if not address:
        return "Toronto"
    street = address.split(",")[0]
    parts = street.strip().split(" ", 1)
    if parts[0].isdigit() and len(parts) > 1:
        return parts[1]
    return street


@router.get("/spots")
def get_spots():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT
            s.id, s.name, s.address, s.lat, s.lng, s.photo_url,
            wp.wifi_score, wp.noise_score, wp.outlet_score,
            wp.work_rating, wp.work_summary
        FROM shops s
        JOIN work_profiles wp ON wp.shop_id = s.id
        WHERE s.work_profile_status = 'done'
        ORDER BY wp.work_rating DESC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "name": row["name"],
            "neighborhood": extract_neighborhood(row["address"]),
            "score": round(float(row["work_rating"]), 1) if row["work_rating"] else 0,
            "coverPhoto": row["photo_url"] or "",
            "amenities": {
                "wifi": wifi_label(row["wifi_score"]),
                "noise": noise_label(row["noise_score"]),
                "outlets": outlet_label(row["outlet_score"]),
            },
            "aiSummary": row["work_summary"] or "",
            "coordinates": [float(row["lat"]), float(row["lng"])],
        })
    return result


@router.post("/spots/recommend")
def recommend_spots(req: RecommendRequest):
    global _last_gemini_call

    if len(req.query.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters.")

    now = time.time()
    if now - _last_gemini_call < 4.0:
        raise HTTPException(status_code=429, detail="Please wait a few seconds between requests.")

    if not GEMINI_API_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail="Add GEMINI_API_KEY to your .env file at the project root to enable AI search.",
        )

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT
            s.id, s.name, s.address, s.reviews_raw,
            wp.wifi_score, wp.noise_score, wp.outlet_score,
            wp.longevity_score, wp.focus_score, wp.work_rating,
            wp.work_summary, wp.best_for, wp.avoid_if
        FROM shops s
        JOIN work_profiles wp ON wp.shop_id = s.id
        WHERE s.work_profile_status = 'done';
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    cafes = []
    for row in rows:
        cafes.append({
            "id": row["id"],
            "name": row["name"],
            "area": extract_neighborhood(row["address"]),
            "wifi": float(row["wifi_score"]) if row["wifi_score"] else 5,
            "noise": float(row["noise_score"]) if row["noise_score"] else 5,
            "outlets": float(row["outlet_score"]) if row["outlet_score"] else 5,
            "longevity": float(row["longevity_score"]) if row["longevity_score"] else 5,
            "focus": float(row["focus_score"]) if row["focus_score"] else 5,
            "rating": round(float(row["work_rating"]), 1) if row["work_rating"] else 0,
            "best_for": row["best_for"] or [],
            "avoid_if": row["avoid_if"] or [],
            "summary": row["work_summary"] or "",
            "reviews": prepare_reviews_for_prompt(row["reviews_raw"] or []),
        })

    profile_section = ""
    if req.preferences:
        p = req.preferences
        profile_section = f"""USER PROFILE:
- Work style: {p.work_type}
- Noise preference: {p.noise_preference}
- Typical session: {p.session_length}
- Must-haves: {', '.join(p.must_haves) if p.must_haves else 'None specified'}"""

    prompt = RECOMMEND_PROMPT.format(
        profile_section=profile_section or "No user profile provided.",
        cafes_json=json.dumps(cafes),
        query=req.query.strip(),
    )

    try:
        _last_gemini_call = time.time()
        response = get_gemini_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"thinking_config": {"thinking_budget": 0}},
        )
        raw_text = response.text
        text = (raw_text or "").strip()
        if not text:
            raise ValueError("empty model response text")
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        results = json.loads(text)
        valid_ids = {c["id"] for c in cafes}
        results = [r for r in results if r.get("id") in valid_ids][:5]
    except Exception:
        raise HTTPException(status_code=503, detail="AI recommendation temporarily unavailable. Please try again.")

    return {"query": req.query, "results": results}
