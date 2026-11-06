"""Серія днів із заморозкою — порт алгоритму з GAME_DESIGN.md («Серія днів із заморозкою»)."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date

START_FREEZES = 1
MAX_FREEZES = 2
FREEZE_EVERY = 3


@dataclass(frozen=True)
class Streak:
    count: int = 0
    best: int = 0
    last_day: date | None = None
    freezes: int = START_FREEZES


@dataclass(frozen=True)
class StreakResult:
    streak: Streak
    changed: bool = False
    comeback: bool = False
    freeze_used: bool = False


def register_activity(streak: Streak, today: date) -> StreakResult:
    count, freezes = streak.count, streak.freezes
    comeback = freeze_used = False

    if streak.last_day is None:
        count = 1
    elif today <= streak.last_day:
        return StreakResult(streak=streak)
    else:
        missed = (today - streak.last_day).days - 1
        if missed == 0:
            count += 1
        elif missed <= freezes:
            freezes -= missed
            count += 1
            freeze_used = True
        else:
            count = 1
            comeback = missed >= 2
        if count % FREEZE_EVERY == 0:
            freezes = min(MAX_FREEZES, freezes + 1)

    new = replace(streak, count=count, best=max(streak.best, count), last_day=today, freezes=freezes)
    return StreakResult(streak=new, changed=True, comeback=comeback, freeze_used=freeze_used)
