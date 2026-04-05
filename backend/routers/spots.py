import os
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DB_URL = "postgresql://workbrew:workbrew@127.0.0.1:5433/workbrew"

router = APIRouter()


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
