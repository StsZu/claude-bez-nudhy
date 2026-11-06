import inspect

from bez_nudhy_bot import texts

FORBIDDEN = ["втратив", "втратиш", "втрат", "згорить", "згор", "останній шанс", "терміново", "поспіши"]


def _all_strings() -> list[str]:
    source = inspect.getsource(texts).lower()
    return [source] + [t.lower() for t in texts.ALL_TEXTS]


def test_no_shaming_or_fake_urgency():
    for text in _all_strings():
        for word in FORBIDDEN:
            assert word not in text, word


def test_pause_text_matches_game_design():
    assert texts.PAUSED == "Ставлю нагадування на паузу. Повернешся — напиши /start, усе збережено."


def test_daily_lesson_format(course):
    lesson = course["lessons"][1]
    msg = texts.daily_lesson(3, lesson, "https://example.com/lesson/2/")
    assert msg.startswith("<b>День 3 · 5 хвилин:</b> місія «Перший розбір завалів»")
    assert "https://example.com/lesson/2/" in msg


def test_quiz_result_shows_why_immediately(course):
    lesson = course["lessons"][0]
    q = lesson["quiz"][1]
    right = texts.quiz_result(lesson, 1, q["answer"])
    wrong = texts.quiz_result(lesson, 1, (q["answer"] + 1) % 3)
    assert "✅" in right and q["why"] in right
    assert "❌" in wrong and q["why"] in wrong and q["options"][q["answer"]] in wrong


def test_streak_note_comeback_only_greets():
    assert texts.streak_note(1, True, False) == texts.COMEBACK
    assert "Заморозка" in texts.streak_note(4, False, True)
