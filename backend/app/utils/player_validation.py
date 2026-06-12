import re

MAX_PLAYER_NAME_LENGTH = 64
MAX_PLAYER_NAME_WORDS = 6

INVALID_NAME_PATTERNS = (
    r"\babout us\b",
    r"\bprivacy policy\b",
    r"\bcookie policy\b",
    r"\bcookie preferences\b",
    r"\bterms and conditions\b",
    r"\bcode of ethics\b",
    r"\bsitemap\b",
    r"\bshow more\b",
    r"\bour network\b",
    r"\bour channels\b",
    r"\bregulatory notice\b",
    r"\badvertise with us\b",
    r"\buser accounts\b",
    r"\bcontact us\b",
    r"\bconnect connect\b",
    r"\bal jazeera\b",
    r"\baccessibility statement\b",
    r"\bchannel finder\b",
    r"\bnewsletters\b",
    r"\bwork for us\b",
    r"\blearn arabic\b",
    r"\bmedia institute\b",
)

FOOTER_MARKERS = (
    "about us",
    "privacy policy",
    "cookie policy",
    "cookie preferences",
    "terms and conditions",
    "code of ethics",
    "sitemap",
    "our network",
    "our channels",
    "regulatory notice",
    "accessibility statement",
    "work for us",
)


def is_footer_text(text: str) -> bool:
    lower = text.lower()
    return any(marker in lower for marker in FOOTER_MARKERS)


def is_valid_player_name(name: str | None) -> bool:
    if not name:
        return False

    cleaned = re.sub(r"\s+", " ", name.strip())
    if len(cleaned) < 2 or len(cleaned) > MAX_PLAYER_NAME_LENGTH:
        return False

    words = cleaned.split()
    if len(words) > MAX_PLAYER_NAME_WORDS:
        return False

    if not re.search(r"[A-Za-zÀ-ÖØ-öø-ÿ]", cleaned):
        return False

    lower = cleaned.lower()
    if is_footer_text(lower):
        return False

    for pattern in INVALID_NAME_PATTERNS:
        if re.search(pattern, lower):
            return False

    if re.search(r"\b(show more|connect connect)\b", lower):
        return False

    return True
