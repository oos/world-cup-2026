from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScoreUpdate:
    score: dict
    source: str
    status: str | None = None
    goals1: list | None = None
    goals2: list | None = None
