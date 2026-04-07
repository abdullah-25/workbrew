"""
reviews.py — Filter and truncate raw reviews before sending to Gemini.

Only work-relevant reviews are forwarded; up to 2 general reviews are
appended for context. Each review is capped at 200 chars to reduce token use.
"""

import pandas as pd

WORK_KEYWORDS = [
    "wifi", "wi-fi", "internet", "outlet", "plug", "charger",
    "work", "laptop", "quiet", "noise", "study", "focus", "hours",
    "cowork", "remote", "meeting",
]


def prepare_reviews_for_prompt(reviews: list[str]) -> str:
    """Return a compact, newline-separated string of the most work-relevant reviews.

    Args:
        reviews: Plain-text review strings from shops.reviews_raw.

    Returns:
        Formatted string ready to embed in a Gemini prompt, or "" if no reviews.
    """
    if not reviews:
        return ""

    df = pd.DataFrame({"text": reviews})

    mask = df["text"].str.lower().apply(
        lambda t: any(kw in t for kw in WORK_KEYWORDS)
    )

    work_relevant = df[mask]
    general = df[~mask].head(2)  # up to 2 non-work reviews as general context

    combined = pd.concat([work_relevant, general], ignore_index=True)
    combined["text"] = combined["text"].str[:200]

    return "\n".join(f"- {row['text']}" for _, row in combined.iterrows())
