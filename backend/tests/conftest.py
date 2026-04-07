import os

# Ensure recommend route tests pass import-time key check in routers.spots
os.environ.setdefault("GEMINI_API_KEY", "test-key-for-pytest")
