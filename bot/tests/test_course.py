import json

import pytest

from bez_nudhy_bot.course import (
    CourseError,
    full_url,
    load_course,
    next_lesson,
    pick_question,
    plan_daily,
    quiz_key,
    validate,
)


def test_fixture_matches_contract(course):
    validate(course)
    assert course["version"] == 1
    assert [l["id"] for l in course["lessons"]] == list(range(1, 9))
    assert all(len(l["quiz"]) == 3 for l in course["lessons"])
    assert [c["day"] for c in course["challenge"]] == list(range(1, 8))


def test_next_lesson_lowest_not_completed(course):
    assert next_lesson(course, [])["id"] == 1
    assert next_lesson(course, [1, 2])["id"] == 3
    assert next_lesson(course, [2, 3, 5])["id"] == 1
    assert next_lesson(course, [1, 2, 3, 5])["id"] == 4
    assert next_lesson(course, range(1, 9)) is None


def test_plan_daily_after_all_lessons(course):
    assert plan_daily(course, [1], 0).kind == "lesson"
    done = list(range(1, 9))
    p = plan_daily(course, done, 1)
    assert p.kind == "challenge" and p.challenge["day"] == 1
    assert plan_daily(course, done, 7).challenge["day"] == 7
    assert plan_daily(course, done, 8).kind == "done"


def test_pick_question_prefers_unanswered_then_rotates(course):
    lesson = course["lessons"][0]
    assert pick_question(lesson, [], 5) == 0
    assert pick_question(lesson, [quiz_key(1, 0)], 0) == 1
    all_done = [quiz_key(1, i) for i in range(3)]
    assert [pick_question(lesson, all_done, t) for t in range(4)] == [0, 1, 2, 0]


def test_full_url(course):
    assert full_url(course, "https://site.ua/", "/lesson/2/") == "https://site.ua/lesson/2/"
    assert full_url(course, "", "/lesson/2/") == "https://example.com/lesson/2/"


def test_load_writes_cache_and_falls_back(tmp_path, course_path):
    cache = tmp_path / "cache" / "course.json"
    data = load_course(str(course_path), cache)
    assert cache.exists()
    assert json.loads(cache.read_text(encoding="utf-8")) == data

    fallback = load_course(str(tmp_path / "missing.json"), cache)
    assert fallback == data

    broken = tmp_path / "broken.json"
    broken.write_text("{ not json", encoding="utf-8")
    assert load_course(str(broken), cache) == data


def test_invalid_source_does_not_overwrite_cache(tmp_path, course_path):
    cache = tmp_path / "course.json"
    good = load_course(str(course_path), cache)
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"version": 2, "lessons": []}), encoding="utf-8")
    assert load_course(str(bad), cache) == good
    assert json.loads(cache.read_text(encoding="utf-8")) == good


def test_no_source_and_no_cache_raises(tmp_path):
    with pytest.raises(CourseError):
        load_course(str(tmp_path / "missing.json"), tmp_path / "no-cache.json")
