"""
score_shops.py — Score all pending shops using Gemini and populate work_profiles.
Run from project root: python backend/services/score_shops.py
"""

import os
import json
import time
import psycopg2
from psycopg2.extras import Json, execute_values
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
DB_URL = "postgresql://workbrew:workbrew@127.0.0.1:5433/workbrew"

# Rate limiting: Gemini free tier allows ~15 RPM
REQUEST_DELAY = 4.5  # seconds between requests (~13 RPM, safe buffer)
MAX_RETRIES = 2

client = genai.Client(api_key=GEMINI_API_KEY)

REFINE_PROMPT = """
You are building a coworking suitability profile for a Toronto coffee shop.
Analyze ONLY through the lens of someone who wants to work from this cafe.

Shop: {name}
Google rating: {google_rating} ({review_count} reviews)
Price level: {price_level}/4

Reviews:
{reviews}

Score each dimension 0–10 based strictly on review evidence.
If reviews don't mention a dimension, score it 5 (neutral/unknown).

Return ONLY valid JSON:
{{
  "wifi_score": <0-10>,
  "noise_score": <0-10>,
  "outlet_score": <0-10>,
  "longevity_score": <0-10>,
  "focus_score": <0-10>,
  "work_rating": <weighted average: wifi×0.25 + noise×0.25 + outlet×0.2 + longevity×0.15 + focus×0.15>,
  "work_summary": "<2 sentences from a remote worker's perspective>",
  "best_for": ["<tag>", "<tag>"],
  "avoid_if": ["<flag>", "<flag>"],
  "peak_hours": "<brief note, or null if unknown>"
}}

Scoring guide:
- wifi_score: 10=reviewers rave about speed, 0=multiple complaints about no/slow wifi
- noise_score: 10=consistently described as quiet/peaceful, 0=loud music/crowded
- outlet_score: 10=plenty of outlets mentioned, 0=no outlets or actively mentioned as missing
- longevity_score: 10=people mention staying hours, 0=rushed/time-limited vibe
- focus_score: 10=reviewers mention working/studying there regularly, 0=party/social vibe only
"""

PRICE_LABEL = {0: "free", 1: "inexpensive", 2: "moderate", 3: "expensive", 4: "very expensive"}


def call_gemini(shop: dict) -> dict:
    reviews = shop["reviews_raw"] or []
    if not reviews:
        return None

    reviews_text = "\n".join(f"- {r}" for r in reviews)
    prompt = REFINE_PROMPT.format(
        name=shop["name"],
        google_rating=shop["google_rating"] or "N/A",
        review_count=shop["google_review_count"] or 0,
        price_level=PRICE_LABEL.get(shop["price_level"], "unknown"),
        reviews=reviews_text,
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = response.text.strip()

            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            data = json.loads(text)

            # Clamp all scores to 0–10
            for key in ("wifi_score", "noise_score", "outlet_score", "longevity_score", "focus_score", "work_rating"):
                if key in data:
                    data[key] = max(0.0, min(10.0, float(data[key])))

            return data

        except (json.JSONDecodeError, ValueError) as e:
            print(f"    Parse error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f"    Gemini error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY)

    return None


INSERT_PROFILE = """
INSERT INTO work_profiles (
    shop_id, wifi_score, noise_score, outlet_score,
    longevity_score, focus_score, work_rating,
    work_summary, best_for, avoid_if, peak_hours
) VALUES (
    %(shop_id)s, %(wifi_score)s, %(noise_score)s, %(outlet_score)s,
    %(longevity_score)s, %(focus_score)s, %(work_rating)s,
    %(work_summary)s, %(best_for)s, %(avoid_if)s, %(peak_hours)s
)
ON CONFLICT DO NOTHING;
"""


def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Open batch_run
    cur.execute(
        "INSERT INTO batch_runs (status) VALUES ('running') RETURNING id;"
    )
    batch_id = cur.fetchone()[0]
    conn.commit()
    print(f"Batch run #{batch_id} started.\n")

    # Fetch pending shops
    cur.execute("""
        SELECT id, name, google_rating, google_review_count, price_level, reviews_raw
        FROM shops
        WHERE work_profile_status = 'pending'
        ORDER BY created_at;
    """)
    shops = cur.fetchall()
    cols = ["id", "name", "google_rating", "google_review_count", "price_level", "reviews_raw"]
    shops = [dict(zip(cols, row)) for row in shops]

    total = len(shops)
    print(f"Found {total} pending shops.\n")

    scored = 0
    errors = 0

    for i, shop in enumerate(shops, 1):
        name = shop["name"] or shop["id"]
        reviews = shop["reviews_raw"] or []

        if not reviews:
            print(f"[{i:02d}/{total}] ~ skipping (no reviews): {name}")
            cur.execute(
                "UPDATE shops SET work_profile_status = 'no_reviews' WHERE id = %s;",
                (shop["id"],),
            )
            conn.commit()
            continue

        print(f"[{i:02d}/{total}] Scoring: {name} ({len(reviews)} reviews)...")

        result = call_gemini(shop)

        if result is None:
            print(f"  ✗ Failed after {MAX_RETRIES} attempts.")
            cur.execute(
                "UPDATE shops SET work_profile_status = 'error' WHERE id = %s;",
                (shop["id"],),
            )
            conn.commit()
            errors += 1
        else:
            peak = result.get("peak_hours")
            if peak and str(peak).lower() in ("null", "none", ""):
                peak = None

            cur.execute(
                INSERT_PROFILE,
                {
                    "shop_id": shop["id"],
                    "wifi_score": result.get("wifi_score"),
                    "noise_score": result.get("noise_score"),
                    "outlet_score": result.get("outlet_score"),
                    "longevity_score": result.get("longevity_score"),
                    "focus_score": result.get("focus_score"),
                    "work_rating": result.get("work_rating"),
                    "work_summary": result.get("work_summary"),
                    "best_for": result.get("best_for", []),
                    "avoid_if": result.get("avoid_if", []),
                    "peak_hours": peak,
                },
            )
            cur.execute(
                "UPDATE shops SET work_profile_status = 'done' WHERE id = %s;",
                (shop["id"],),
            )
            conn.commit()
            scored += 1
            print(f"  ✓ work_rating={result.get('work_rating'):.1f}  wifi={result.get('wifi_score')}  noise={result.get('noise_score')}")

        # Rate limiting — wait between every request (including after errors)
        if i < total:
            time.sleep(REQUEST_DELAY)

    # Close batch_run
    cur.execute(
        """
        UPDATE batch_runs
        SET finished_at = now(), shops_refined = %s, errors = %s, status = 'done'
        WHERE id = %s;
        """,
        (scored, errors, batch_id),
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f"\nBatch #{batch_id} complete. Scored: {scored}, Errors: {errors}, Skipped: {total - scored - errors}")


if __name__ == "__main__":
    main()
