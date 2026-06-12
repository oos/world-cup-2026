COUNTRY_CODE_NAMES: dict[str, str] = {
    "us": "USA",
    "ca": "Canada",
    "mx": "Mexico",
    "qa": "Qatar",
    "ru": "Russia",
    "br": "Brazil",
    "za": "South Africa",
    "de": "Germany",
    "kr": "South Korea",
    "jp": "Japan",
    "fr": "France",
    "it": "Italy",
    "es": "Spain",
    "ar": "Argentina",
    "se": "Sweden",
    "ch": "Switzerland",
    "cl": "Chile",
    "uy": "Uruguay",
    "gb": "England",
    "eng": "England",
}


def normalize_country_code(value: str | None) -> str | None:
    if not value:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) <= 3:
        mapped = COUNTRY_CODE_NAMES.get(trimmed.lower())
        if mapped:
            return mapped
    return trimmed
