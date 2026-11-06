"""Завантаження course.json (контракт v1 з plan.md) і вибір наступної місії."""

from __future__ import annotations

import json
import logging
import os
import tempfile
import urllib.request
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

CONTRACT_VERSION = 1
CHALLENGE_DAYS = 7


class CourseError(Exception):
    pass


def _read_source(source: str, timeout: float) -> str:
    if source.startswith(("http://", "https://")):
        with urllib.request.urlopen(source, timeout=timeout) as resp:  # noqa: S310 - адреса з .env власника
            return resp.read().decode("utf-8")
    return Path(source).read_text(encoding="utf-8")


def validate(data: Any) -> dict:
    def need(cond: bool, msg: str) -> None:
        if not cond:
            raise CourseError(msg)

    need(isinstance(data, dict), "course.json: очікується об'єкт")
    need(data.get("version") == CONTRACT_VERSION, f"course.json: version має бути {CONTRACT_VERSION}")
    lessons = data.get("lessons")
    need(isinstance(lessons, list) and lessons, "course.json: немає lessons")
    for lesson in lessons:
        need(isinstance(lesson, dict), "course.json: урок має бути об'єктом")
        lid = lesson.get("id")
        need(isinstance(lid, int), "course.json: урок без id")
        for key in ("title", "mission", "url"):
            need(isinstance(lesson.get(key), str) and lesson[key], f"course.json: урок {lid} без поля {key}")
        quiz = lesson.get("quiz")
        need(isinstance(quiz, list) and quiz, f"course.json: урок {lid} без quiz")
        for i, q in enumerate(quiz):
            opts = q.get("options") if isinstance(q, dict) else None
            need(
                isinstance(q, dict)
                and isinstance(q.get("q"), str)
                and isinstance(opts, list)
                and len(opts) >= 2
                and isinstance(q.get("answer"), int)
                and 0 <= q["answer"] < len(opts)
                and isinstance(q.get("why"), str),
                f"course.json: урок {lid}, питання {i + 1} не відповідає контракту",
            )
    challenge = data.get("challenge", [])
    need(isinstance(challenge, list), "course.json: challenge має бути списком")
    for item in challenge:
        need(
            isinstance(item, dict) and isinstance(item.get("day"), int) and isinstance(item.get("text"), str),
            "course.json: день челенджу без day або text",
        )
    return data


def _write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".course-", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.replace(tmp, path)


def load_course(source: str, cache_path: str | Path, timeout: float = 10.0) -> dict:
    """Завантажити курс із джерела; при успіху оновити кеш, при помилці — взяти кеш."""
    cache = Path(cache_path)
    try:
        text = _read_source(source, timeout)
        data = validate(json.loads(text))
    except Exception as exc:  # будь-яка помилка джерела → остання вдала копія
        log.warning("course.json недоступний (%s), беру збережену копію %s", exc, cache)
        try:
            return validate(json.loads(cache.read_text(encoding="utf-8")))
        except Exception as cache_exc:
            raise CourseError(f"Немає ні джерела, ні збереженої копії курсу: {cache_exc}") from exc
    try:
        _write_atomic(cache, json.dumps(data, ensure_ascii=False))
    except OSError as exc:
        log.warning("Не вдалося зберегти копію курсу: %s", exc)
    return data


def lessons_sorted(course: dict) -> list[dict]:
    return sorted(course["lessons"], key=lambda lesson: lesson["id"])


def lesson_by_id(course: dict, lesson_id: int) -> dict | None:
    return next((l for l in course["lessons"] if l["id"] == lesson_id), None)


def next_lesson(course: dict, completed: Iterable[int]) -> dict | None:
    done = set(completed)
    return next((l for l in lessons_sorted(course) if l["id"] not in done), None)


def challenge_day(course: dict, day: int) -> dict | None:
    return next((c for c in course.get("challenge", []) if c["day"] == day), None)


def pick_question(lesson: dict, answered: Iterable[str], turn: int) -> int:
    """Індекс питання: перше ще не відповідане, інакше по колу за лічильником."""
    done = set(answered)
    quiz = lesson["quiz"]
    for i in range(len(quiz)):
        if quiz_key(lesson["id"], i) not in done:
            return i
    return turn % len(quiz)


def quiz_key(lesson_id: int, index: int) -> str:
    return f"{lesson_id}:{index}"


def site_base(course: dict, site_url: str | None) -> str:
    return (site_url or course.get("site") or "").rstrip("/")


def full_url(course: dict, site_url: str | None, path: str) -> str:
    if path.startswith(("http://", "https://")):
        return path
    return site_base(course, site_url) + "/" + path.lstrip("/")


@dataclass(frozen=True)
class DailyPlan:
    kind: str  # "lesson" | "challenge" | "done"
    lesson: dict | None = None
    challenge: dict | None = None


def plan_daily(course: dict, completed: Iterable[int], challenge_sent: int) -> DailyPlan:
    """Що надіслати сьогодні. challenge_sent — скільки днів челенджу вже надіслано, включно з сьогоднішнім."""
    lesson = next_lesson(course, completed)
    if lesson is not None:
        return DailyPlan("lesson", lesson=lesson)
    item = challenge_day(course, challenge_sent) if challenge_sent >= 1 else None
    if item is not None:
        return DailyPlan("challenge", challenge=item)
    return DailyPlan("done")
