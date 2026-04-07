# WorkBrew

WorkBrew helps remote workers discover Toronto cafés that fit how they work. Browse spots on a map, filter by basics like Wi‑Fi and noise, save favourites, and use natural-language search—powered by your saved preferences—to get ranked picks with short explanations.

![WorkBrew UI](docs/screenshot.png)

## Run locally with Docker

1. **Environment** — Copy `.env.example` to `.env` at the repo root. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` (defaults match Compose). Add a [Google AI Studio](https://aistudio.google.com/apikey) `GEMINI_API_KEY` for AI search and shop scoring.

2. **Start the stack** — From the project root:

   ```bash
   docker compose up --build
   ```

3. **Open the app** — Frontend: [http://localhost:3000](http://localhost:3000). API docs: [http://localhost:8000/docs](http://localhost:8000/docs). Postgres is exposed on host port `5433` if you need a local client.

Optional: with `GOOGLE_MAPS_API_KEY` you can run `python backend/seed.py` (café data) and `python backend/services/score_shops.py` (work profiles) against the same `DATABASE_URL` your backend uses.

## Data layer

Raw Google reviews are stored per shop. Before any Gemini call, **`prepare_reviews_for_prompt`** in `backend/services/reviews.py` loads reviews into **pandas**, flags lines that mention work-related terms (Wi‑Fi, outlets, noise, focus, and similar), keeps those rows, appends at most two non-matching reviews for context, then **truncates each line to 200 characters**. The result is a compact bullet list so only the most relevant review text is sent downstream, saving tokens and reducing noise.

## AI layer

The recommend endpoint builds a **Gemini** prompt that includes the user’s free-text **query** plus a **USER PROFILE** block when preferences exist (work style, noise preference, session length, must-haves). That profile is merged with structured café data (scores, summaries, `best_for` / `avoid_if`, and the filtered reviews from the data layer). The model is instructed to rank cafés using the profile first, then refine by the specific request—so the same question can yield different results depending on what you’ve saved in the app.
