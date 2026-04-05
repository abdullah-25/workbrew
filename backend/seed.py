"""
seed.py — Fetch ~50 Toronto cafes from Google Places API and insert into shops table.
Run from project root: python backend/seed.py
"""

import os
import json
import time
import requests
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

API_KEY = os.environ["GOOGLE_MAPS_API_KEY"]
DB_URL = "postgresql://workbrew:workbrew@127.0.0.1:5433/workbrew"

NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
DETAILS_URL = "https://places.googleapis.com/v1/places/{}"
PHOTO_MEDIA_URL = "https://places.googleapis.com/v1/{}/media"

NEARBY_FIELD_MASK = "places.id"
DETAILS_FIELD_MASK = (
    "id,displayName,formattedAddress,location,"
    "rating,userRatingCount,priceLevel,"
    "regularOpeningHours,reviews,photos"
)

PRICE_MAP = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}

# Toronto search zones — spread across the city to maximize unique results
SEARCH_ZONES = [
    (43.6532, -79.3832, 2000),   # Downtown core
    (43.6693, -79.3926, 2000),   # Midtown / Yonge-Eglinton
    (43.6677, -79.3162, 2000),   # East End / Leslieville
    (43.6439, -79.4628, 2000),   # West End / Junction
    (43.7081, -79.3986, 2000),   # North York
    (43.6550, -79.4000, 1500),   # Little Italy / Harbord
    (43.6450, -79.3732, 1500),   # Distillery / St Lawrence
]


def nearby_search(lat, lng, radius):
    resp = requests.post(
        NEARBY_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": NEARBY_FIELD_MASK,
        },
        json={
            "includedTypes": ["cafe"],
            "maxResultCount": 20,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": float(radius),
                }
            },
        },
    )
    resp.raise_for_status()
    return [p["id"] for p in resp.json().get("places", [])]


def fetch_photo_url(photos: list) -> str | None:
    """Given the photos array from Place Details, resolve the first photo to a CDN URL."""
    if not photos:
        return None
    photo_name = photos[0].get("name")
    if not photo_name:
        return None
    try:
        media_resp = requests.get(
            PHOTO_MEDIA_URL.format(photo_name),
            params={"maxWidthPx": 800, "key": API_KEY},
            allow_redirects=True,
            timeout=10,
        )
        media_resp.raise_for_status()
        return media_resp.url
    except Exception:
        return None


def place_details(place_id):
    resp = requests.get(
        DETAILS_URL.format(place_id),
        headers={
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
    )
    resp.raise_for_status()
    return resp.json()


def parse_shop(data):
    reviews_raw = [
        r["text"]["text"]
        for r in data.get("reviews", [])
        if r.get("text", {}).get("text")
    ]
    loc = data.get("location", {})
    photo_url = fetch_photo_url(data.get("photos", []))
    return {
        "id": data["id"],
        "name": data.get("displayName", {}).get("text"),
        "address": data.get("formattedAddress"),
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
        "google_rating": data.get("rating"),
        "google_review_count": data.get("userRatingCount"),
        "price_level": PRICE_MAP.get(data.get("priceLevel")),
        "opening_hours": data.get("regularOpeningHours"),
        "reviews_raw": reviews_raw,
        "photo_url": photo_url,
    }


INSERT_SQL = """
INSERT INTO shops (
    id, name, address, lat, lng,
    google_rating, google_review_count, price_level,
    opening_hours, reviews_raw, photo_url
) VALUES (
    %(id)s, %(name)s, %(address)s, %(lat)s, %(lng)s,
    %(google_rating)s, %(google_review_count)s, %(price_level)s,
    %(opening_hours)s, %(reviews_raw)s, %(photo_url)s
)
ON CONFLICT (id) DO NOTHING;
"""


def backfill_photos(conn):
    """Backfill photo_url for shops that were seeded without it."""
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM shops WHERE photo_url IS NULL ORDER BY name;")
    shops = cur.fetchall()
    if not shops:
        print("No shops need photo backfill.")
        cur.close()
        return

    print(f"\nBackfilling photos for {len(shops)} shops...")
    for shop_id, name in shops:
        try:
            data = place_details(shop_id)
            url = fetch_photo_url(data.get("photos", []))
            if url:
                cur.execute("UPDATE shops SET photo_url = %s WHERE id = %s;", (url, shop_id))
                conn.commit()
                print(f"  ✓ {name}")
            else:
                print(f"  ~ no photo: {name}")
        except Exception as e:
            print(f"  ✗ {name}: {e}")
        time.sleep(0.3)
    cur.close()
    print("Photo backfill done.")


def main():
    # --- Collect unique place IDs ---
    print("Searching for cafes across Toronto...")
    place_ids = set()
    for lat, lng, radius in SEARCH_ZONES:
        ids = nearby_search(lat, lng, radius)
        new = [i for i in ids if i not in place_ids]
        place_ids.update(new)
        print(f"  zone ({lat:.4f}, {lng:.4f}) → {len(ids)} results, {len(new)} new (total: {len(place_ids)})")
        if len(place_ids) >= 50:
            break
        time.sleep(0.3)

    place_ids = list(place_ids)[:50]
    print(f"\nFetching details for {len(place_ids)} cafes...")

    # --- Fetch details and insert ---
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    inserted = 0
    skipped = 0

    for i, pid in enumerate(place_ids, 1):
        try:
            data = place_details(pid)
            shop = parse_shop(data)
            cur.execute(
                INSERT_SQL,
                {
                    **shop,
                    "opening_hours": Json(shop["opening_hours"]) if shop["opening_hours"] else None,
                    "reviews_raw": Json(shop["reviews_raw"]),
                },
            )
            if cur.rowcount:
                inserted += 1
                print(f"  [{i:02d}/{len(place_ids)}] ✓ {shop['name']}")
            else:
                skipped += 1
                print(f"  [{i:02d}/{len(place_ids)}] ~ skipped (already exists): {shop['name']}")
            time.sleep(0.3)
        except Exception as e:
            print(f"  [{i:02d}/{len(place_ids)}] ✗ {pid}: {e}")

    conn.commit()
    cur.close()

    # Backfill photos for any shops missing them (including pre-existing ones)
    backfill_photos(conn)

    conn.close()
    print(f"\nDone. Inserted: {inserted}, Skipped: {skipped}")


if __name__ == "__main__":
    main()
