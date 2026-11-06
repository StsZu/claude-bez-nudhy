"""SQLite-сховище користувачів бота (stdlib sqlite3)."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from .game import Streak

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    chat_id            INTEGER PRIMARY KEY,
    remind_time        TEXT,
    enabled            INTEGER NOT NULL DEFAULT 1,
    paused             INTEGER NOT NULL DEFAULT 0,
    last_sent_date     TEXT,
    last_reaction_date TEXT,
    streak_count       INTEGER NOT NULL DEFAULT 0,
    streak_best        INTEGER NOT NULL DEFAULT 0,
    streak_last_day    TEXT,
    streak_freezes     INTEGER NOT NULL DEFAULT 1,
    completed          TEXT NOT NULL DEFAULT '[]',
    answered           TEXT NOT NULL DEFAULT '[]',
    day_number         INTEGER NOT NULL DEFAULT 0,
    challenge_day      INTEGER NOT NULL DEFAULT 0,
    quiz_turn          INTEGER NOT NULL DEFAULT 0
)
"""


def _d(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _s(value: date | None) -> str | None:
    return value.isoformat() if value else None


@dataclass
class User:
    chat_id: int
    remind_time: str | None = None
    enabled: bool = True
    paused: bool = False
    last_sent_date: date | None = None
    last_reaction_date: date | None = None
    streak: Streak = field(default_factory=Streak)
    completed: list[int] = field(default_factory=list)
    answered: list[str] = field(default_factory=list)
    day_number: int = 0
    challenge_day: int = 0
    quiz_turn: int = 0


class Database:
    def __init__(self, path: str | Path = ":memory:") -> None:
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute(SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    @staticmethod
    def _row_to_user(row: sqlite3.Row) -> User:
        return User(
            chat_id=row["chat_id"],
            remind_time=row["remind_time"],
            enabled=bool(row["enabled"]),
            paused=bool(row["paused"]),
            last_sent_date=_d(row["last_sent_date"]),
            last_reaction_date=_d(row["last_reaction_date"]),
            streak=Streak(
                count=row["streak_count"],
                best=row["streak_best"],
                last_day=_d(row["streak_last_day"]),
                freezes=row["streak_freezes"],
            ),
            completed=json.loads(row["completed"]),
            answered=json.loads(row["answered"]),
            day_number=row["day_number"],
            challenge_day=row["challenge_day"],
            quiz_turn=row["quiz_turn"],
        )

    def get(self, chat_id: int) -> User | None:
        row = self.conn.execute("SELECT * FROM users WHERE chat_id = ?", (chat_id,)).fetchone()
        return self._row_to_user(row) if row else None

    def all_users(self) -> list[User]:
        return [self._row_to_user(r) for r in self.conn.execute("SELECT * FROM users")]

    def save(self, user: User) -> None:
        self.conn.execute(
            """
            INSERT INTO users (chat_id, remind_time, enabled, paused, last_sent_date, last_reaction_date,
                streak_count, streak_best, streak_last_day, streak_freezes, completed, answered,
                day_number, challenge_day, quiz_turn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
                remind_time = excluded.remind_time, enabled = excluded.enabled, paused = excluded.paused,
                last_sent_date = excluded.last_sent_date, last_reaction_date = excluded.last_reaction_date,
                streak_count = excluded.streak_count, streak_best = excluded.streak_best,
                streak_last_day = excluded.streak_last_day, streak_freezes = excluded.streak_freezes,
                completed = excluded.completed, answered = excluded.answered,
                day_number = excluded.day_number, challenge_day = excluded.challenge_day,
                quiz_turn = excluded.quiz_turn
            """,
            (
                user.chat_id,
                user.remind_time,
                int(user.enabled),
                int(user.paused),
                _s(user.last_sent_date),
                _s(user.last_reaction_date),
                user.streak.count,
                user.streak.best,
                _s(user.streak.last_day),
                user.streak.freezes,
                json.dumps(sorted(set(user.completed))),
                json.dumps(sorted(set(user.answered))),
                user.day_number,
                user.challenge_day,
                user.quiz_turn,
            ),
        )
        self.conn.commit()

    def get_or_create(self, chat_id: int, today: date) -> tuple[User, bool]:
        user = self.get(chat_id)
        if user is not None:
            return user, False
        user = User(chat_id=chat_id, last_reaction_date=today)
        self.save(user)
        return user, True

    def set_time(self, chat_id: int, hhmm: str) -> None:
        self.conn.execute(
            "UPDATE users SET remind_time = ?, enabled = 1, paused = 0 WHERE chat_id = ?", (hhmm, chat_id)
        )
        self.conn.commit()

    def set_enabled(self, chat_id: int, enabled: bool) -> None:
        self.conn.execute("UPDATE users SET enabled = ? WHERE chat_id = ?", (int(enabled), chat_id))
        self.conn.commit()

    def set_paused(self, chat_id: int, paused: bool) -> None:
        self.conn.execute("UPDATE users SET paused = ? WHERE chat_id = ?", (int(paused), chat_id))
        self.conn.commit()

    def mark_sent(self, chat_id: int, today: date) -> None:
        self.conn.execute("UPDATE users SET last_sent_date = ? WHERE chat_id = ?", (_s(today), chat_id))
        self.conn.commit()

    def touch_reaction(self, chat_id: int, today: date) -> None:
        """Будь-яка реакція учня: запам'ятати дату й зняти паузу."""
        self.conn.execute(
            "UPDATE users SET last_reaction_date = ?, paused = 0 WHERE chat_id = ?", (_s(today), chat_id)
        )
        self.conn.commit()

    def forget(self, chat_id: int) -> bool:
        cur = self.conn.execute("DELETE FROM users WHERE chat_id = ?", (chat_id,))
        self.conn.commit()
        return cur.rowcount > 0
