import asyncio
from datetime import date, datetime
from zoneinfo import ZoneInfo

from aiogram.exceptions import TelegramForbiddenError
from aiogram.methods import SendMessage

from bez_nudhy_bot import texts
from bez_nudhy_bot.db import Database
from bez_nudhy_bot.main import App, CourseStore, build_dispatcher, run_tick, send_daily

KYIV = ZoneInfo("Europe/Kyiv")
NOW = datetime(2026, 11, 6, 9, 0, tzinfo=KYIV)
TODAY = NOW.date()


class FakeBot:
    def __init__(self, blocked: set[int] = frozenset()):
        self.sent: list[tuple[int, str, object]] = []
        self.blocked = blocked

    async def send_message(self, chat_id, text, reply_markup=None, **_):
        if chat_id in self.blocked:
            raise TelegramForbiddenError(
                method=SendMessage(chat_id=chat_id, text=text), message="Forbidden: bot was blocked by the user"
            )
        self.sent.append((chat_id, text, reply_markup))


def make_app(course) -> App:
    store = CourseStore("unused", "unused")
    store.course = course
    return App(Database(), store, "https://site.ua", KYIV)


def subscribe(app: App, chat_id: int, **kw):
    user, _ = app.db.get_or_create(chat_id, kw.pop("reaction", TODAY))
    user.remind_time = "09:00"
    for k, v in kw.items():
        setattr(user, k, v)
    app.db.save(user)
    return app.db.get(chat_id)


def test_dispatcher_builds_without_token(course):
    assert build_dispatcher(make_app(course)) is not None


def test_daily_message_has_mission_link_and_quiz(course):
    app, bot = make_app(course), FakeBot()
    subscribe(app, 1, completed=[1])
    asyncio.run(run_tick(bot, app, NOW))
    assert len(bot.sent) == 1
    _, text, kb = bot.sent[0]
    assert "День 1 · 5 хвилин" in text and "«Перший розбір завалів»" in text
    assert "https://site.ua/lesson/2/" in text
    buttons = [b for row in kb.inline_keyboard for b in row]
    assert any(b.text == texts.QUIZ_BUTTON and b.callback_data == "quiz:2" for b in buttons)
    assert any(b.text == texts.LESSON_DONE_BUTTON for b in buttons)
    assert app.db.get(1).last_sent_date == TODAY
    asyncio.run(run_tick(bot, app, NOW))
    assert len(bot.sent) == 1  # не більше одного на день


def test_today_twice_same_day_does_not_advance(course):
    app, bot = make_app(course), FakeBot()
    user = subscribe(app, 1)
    asyncio.run(send_daily(bot, app, user, NOW))
    asyncio.run(send_daily(bot, app, app.db.get(1), NOW))
    assert app.db.get(1).day_number == 1
    assert "День 1" in bot.sent[1][1]


def test_blocked_user_is_disabled_without_crash(course):
    app, bot = make_app(course), FakeBot(blocked={1})
    subscribe(app, 1)
    subscribe(app, 2)
    asyncio.run(run_tick(bot, app, NOW))
    assert app.db.get(1).enabled is False
    assert [c for c, _, _ in bot.sent] == [2]


def test_pause_message_sent_once(course):
    app, bot = make_app(course), FakeBot()
    subscribe(app, 1, reaction=date(2026, 11, 2))
    asyncio.run(run_tick(bot, app, NOW))
    assert [t for _, t, _ in bot.sent] == [texts.PAUSED]
    assert app.db.get(1).paused is True
    asyncio.run(run_tick(bot, app, datetime(2026, 11, 7, 9, 0, tzinfo=KYIV)))
    assert len(bot.sent) == 1


def test_after_all_lessons_challenge_then_done(course):
    app, bot = make_app(course), FakeBot()
    subscribe(app, 1, completed=list(range(1, 9)))
    for d in range(1, 9):
        user = app.db.get(1)
        asyncio.run(send_daily(bot, app, user, datetime(2026, 11, d, 9, 0, tzinfo=KYIV)))
    assert "практика 1 з 7" in bot.sent[0][1]
    assert "практика 7 з 7" in bot.sent[6][1]
    assert bot.sent[7][1].startswith("Ти пройшов усі 8 місій")
    assert app.db.get(1).enabled is False


class FakeChat:
    def __init__(self, chat_id):
        self.id = chat_id


class FakeMessage:
    def __init__(self, chat_id):
        self.chat = FakeChat(chat_id)
        self.edited: list[str] = []
        self.answers: list[str] = []

    async def edit_text(self, text, reply_markup=None, **_):
        self.edited.append(text)

    async def answer(self, text, reply_markup=None, **_):
        self.answers.append(text)


class FakeCallback:
    def __init__(self, chat_id, data):
        self.data = data
        self.message = FakeMessage(chat_id)

    async def answer(self, *_, **__):
        pass


def test_quiz_answer_shows_why_and_counts_for_streak(course, monkeypatch):
    from bez_nudhy_bot import main

    app = make_app(course)
    monkeypatch.setattr(App, "now", lambda self: NOW)
    subscribe(app, 1)
    cb = FakeCallback(1, "quiz:1")
    asyncio.run(main.cb_quiz(cb, app))
    assert "Тестове питання 1 уроку 1?" in cb.message.answers[0]

    cb = FakeCallback(1, "ans:1:0:2")
    asyncio.run(main.cb_answer(cb, app))
    edited = cb.message.edited[0]
    assert "❌" in edited and "Тестове пояснення 1 уроку 1." in edited
    user = app.db.get(1)
    assert user.streak.count == 1 and user.answered == ["1:0"]

    cb = FakeCallback(1, "quiz:1")
    asyncio.run(main.cb_quiz(cb, app))
    assert "Тестове питання 2 уроку 1?" in cb.message.answers[0]


def test_lesson_done_marks_completed(course, monkeypatch):
    from bez_nudhy_bot import main

    app = make_app(course)
    monkeypatch.setattr(App, "now", lambda self: NOW)
    subscribe(app, 1)
    cb = FakeCallback(1, "done:1")
    asyncio.run(main.cb_done(cb, app))
    assert app.db.get(1).completed == [1]
    assert "«Перший розбір завалів»" in cb.message.answers[0]
    cb = FakeCallback(1, "done:1")
    asyncio.run(main.cb_done(cb, app))
    assert cb.message.answers[0] == texts.LESSON_ALREADY.format(id=1)


def test_malformed_callback_is_ignored(course):
    from bez_nudhy_bot import main

    app = make_app(course)
    subscribe(app, 1)
    cb = FakeCallback(1, "ans:x:y")
    asyncio.run(main.cb_answer(cb, app))
    assert cb.message.edited == []
