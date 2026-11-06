"""Чисті функції розсилки: кому писати зараз і коли ставити паузу."""

from __future__ import annotations

import re
from collections.abc import Iterable
from datetime import date, datetime

from .db import User

QUIET_FROM_HOUR = 22  # з 22:00 нічого не надсилаємо
QUIET_TO_HOUR = 7  # до 07:00 нічого не надсилаємо
PAUSE_AFTER_DAYS = 3

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def is_quiet(now: datetime) -> bool:
    return now.hour >= QUIET_FROM_HOUR or now.hour < QUIET_TO_HOUR


def parse_time(text: str) -> str | None:
    """'9:05' / '09:05' → '09:05'; None, якщо формат неправильний."""
    text = text.strip()
    if re.fullmatch(r"\d:\d\d", text):
        text = "0" + text
    return text if _TIME_RE.match(text) else None


def time_allowed(hhmm: str) -> bool:
    hour = int(hhmm[:2])
    return QUIET_TO_HOUR <= hour < QUIET_FROM_HOUR


def due_users(now_kyiv: datetime, users: Iterable[User]) -> list[User]:
    if is_quiet(now_kyiv):
        return []
    hhmm = now_kyiv.strftime("%H:%M")
    today = now_kyiv.date()
    return [
        u
        for u in users
        if u.enabled and not u.paused and u.remind_time == hhmm and u.last_sent_date != today
    ]


def should_pause(last_reaction_date: date | None, today: date) -> bool:
    """True, якщо між останньою реакцією і сьогодні минуло 3 повні дні без реакції."""
    if last_reaction_date is None:
        return False
    full_days_without_reaction = (today - last_reaction_date).days - 1
    return full_days_without_reaction >= PAUSE_AFTER_DAYS


def plan_tick(now_kyiv: datetime, users: Iterable[User]) -> list[tuple[User, str]]:
    """Для кожного, кому час писати: 'daily' або одноразове 'pause' замість щоденного."""
    today = now_kyiv.date()
    return [
        (u, "pause" if should_pause(u.last_reaction_date, today) else "daily") for u in due_users(now_kyiv, users)
    ]
