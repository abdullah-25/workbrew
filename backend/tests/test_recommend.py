import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

FAKE_DB_ROWS = [
    {
        "id": "cafe_1",
        "name": "Quiet Bean",
        "address": "123 Queen St W, Toronto, ON",
        "wifi_score": 9,
        "noise_score": 9,
        "outlet_score": 8,
        "longevity_score": 8,
        "focus_score": 9,
        "work_rating": 8.7,
        "work_summary": "Great quiet cafe for focused work.",
        "best_for": ["deep focus", "long sessions"],
        "avoid_if": [],
    },
    {
        "id": "cafe_2",
        "name": "Buzz Hub",
        "address": "456 King St E, Toronto, ON",
        "wifi_score": 7,
        "noise_score": 4,
        "outlet_score": 6,
        "longevity_score": 5,
        "focus_score": 4,
        "work_rating": 5.4,
        "work_summary": "Lively spot good for casual work.",
        "best_for": ["meetings", "casual work"],
        "avoid_if": ["noise-sensitive"],
    },
    {
        "id": "cafe_3",
        "name": "Code Corner",
        "address": "789 Bloor St W, Toronto, ON",
        "wifi_score": 8,
        "noise_score": 7,
        "outlet_score": 9,
        "longevity_score": 9,
        "focus_score": 8,
        "work_rating": 8.1,
        "work_summary": "Solid all-rounder with plenty of outlets.",
        "best_for": ["long sessions", "coding"],
        "avoid_if": [],
    },
]

GEMINI_RESPONSE_JSON = json.dumps([
    {"id": "cafe_1", "reasoning": "Top noise score (9/10) and focus score (9/10) — ideal for quiet coding."},
    {"id": "cafe_3", "reasoning": "Strong wifi (8/10) with plenty of outlets for long sessions."},
    {"id": "cafe_2", "reasoning": "Good wifi but lively atmosphere may not suit deep focus."},
])


def make_mock_cursor(rows):
    cur = MagicMock()
    cur.fetchall.return_value = rows
    cur.close.return_value = None
    return cur


def make_mock_conn(rows):
    conn = MagicMock()
    conn.cursor.return_value = make_mock_cursor(rows)
    conn.close.return_value = None
    return conn


def make_mock_gemini_response(text):
    resp = MagicMock()
    resp.text = text
    return resp


@pytest.fixture(autouse=True)
def reset_rate_limit():
    """Reset the rate limiter before each test."""
    import routers.spots as spots_mod
    spots_mod._last_gemini_call = 0.0
    yield


@pytest.fixture()
def mock_db():
    with patch("routers.spots.psycopg2") as mock_pg:
        mock_pg.connect.return_value = make_mock_conn(FAKE_DB_ROWS)
        mock_pg.extras = MagicMock()
        yield mock_pg


@pytest.fixture()
def mock_gemini():
    mock_client = MagicMock()
    with patch("routers.spots.get_gemini_client", return_value=mock_client):
        yield mock_client


@pytest.fixture()
def client(mock_db):
    from main import app
    return TestClient(app)


# --- Tests ---

def test_recommend_returns_ranked_results(client, mock_gemini):
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(GEMINI_RESPONSE_JSON)

    resp = client.post("/api/spots/recommend", json={
        "query": "quiet place for coding",
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "quiet place for coding"
    assert len(data["results"]) == 3  # only 3 cafes in fake DB
    assert data["results"][0]["id"] == "cafe_1"
    assert "reasoning" in data["results"][0]


def test_recommend_with_preferences(client, mock_gemini):
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(GEMINI_RESPONSE_JSON)

    resp = client.post("/api/spots/recommend", json={
        "query": "quiet place for coding",
        "preferences": {
            "work_type": "Deep focus work",
            "noise_preference": "Silent",
            "session_length": "Full day (4+ hrs)",
            "must_haves": ["Fast WiFi", "Many outlets"],
        },
    })

    assert resp.status_code == 200
    call_args = mock_gemini.models.generate_content.call_args
    prompt_text = call_args.kwargs.get("contents", "")
    assert "Deep focus work" in prompt_text
    assert "Silent" in prompt_text


def test_recommend_without_preferences(client, mock_gemini):
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(GEMINI_RESPONSE_JSON)

    resp = client.post("/api/spots/recommend", json={
        "query": "good wifi spot",
    })

    assert resp.status_code == 200
    call_args = mock_gemini.models.generate_content.call_args
    prompt_text = call_args.kwargs.get("contents", "")
    assert "No user profile provided." in prompt_text


def test_recommend_query_too_short(client):
    resp = client.post("/api/spots/recommend", json={"query": "hi"})
    assert resp.status_code == 400
    assert "at least 3 characters" in resp.json()["detail"]


def test_recommend_rate_limit(client, mock_gemini):
    """Rapid sequential calls should be rate-limited."""
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(GEMINI_RESPONSE_JSON)

    # First call should succeed
    resp1 = client.post("/api/spots/recommend", json={"query": "quiet coding spot"})
    assert resp1.status_code == 200

    # Second call immediately after should be rate-limited
    resp2 = client.post("/api/spots/recommend", json={"query": "another query here"})
    assert resp2.status_code == 429
    assert "wait" in resp2.json()["detail"].lower()


def test_recommend_gemini_failure(client, mock_gemini):
    mock_gemini.models.generate_content.side_effect = Exception("API error")

    resp = client.post("/api/spots/recommend", json={"query": "quiet place for coding"})
    assert resp.status_code == 503
    assert "unavailable" in resp.json()["detail"].lower()


def test_recommend_strips_markdown_fences(client, mock_gemini):
    fenced = "```json\n" + GEMINI_RESPONSE_JSON + "\n```"
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(fenced)

    resp = client.post("/api/spots/recommend", json={"query": "quiet place for coding"})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 3


def test_recommend_filters_invalid_ids(client, mock_gemini):
    bad_response = json.dumps([
        {"id": "cafe_1", "reasoning": "Good spot."},
        {"id": "FAKE_ID", "reasoning": "This should be filtered out."},
        {"id": "cafe_2", "reasoning": "Also good."},
    ])
    mock_gemini.models.generate_content.return_value = make_mock_gemini_response(bad_response)

    resp = client.post("/api/spots/recommend", json={"query": "quiet place for coding"})
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.json()["results"]]
    assert "FAKE_ID" not in ids
    assert len(ids) == 2
