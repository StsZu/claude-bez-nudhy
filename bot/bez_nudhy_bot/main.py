"""Точка входу бота: aiogram Dispatcher, команди, кнопки й щохвилинний цикл розсилки.

Під час імпорту нічого не запускається; токен потрібен лише у main().
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramForbiddenError, TelegramRetryAfter
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from . import texts
from .course import (
    CourseError,
    full_url,
    lesson_by_id,
    load_course,
    next_lesson,
    pick_question,
    plan_daily,
    quiz_key,
)
from .db import Database, User
from .game import register_activity
from .scheduler import parse_time, plan_tick, time_allowed

log = logging.getLogger("bez_nudhy_bot")

COURSE_REFRESH_SECONDS = 3600


@dataclass(frozen=True)
class Config:
    token: str
    site_url: str
    course_source: str
    db_path: str
    cache_path: str
    tz_name: str

    @classmethod
    def from_env(cls) -> Config:
        db_path = os.environ.get("DB_PATH", "./data/bot.sqlite3")
        default_cache = str(Path(db_path).parent / "course.cache.json")
        return cls(
            token=os.environ.get("BOT_TOKEN", ""),
            site_url=os.environ.get("SITE_URL", ""),
            course_source=os.environ.get("COURSE_JSON", "../web/dist/course.json"),
            db_path=db_path,
            cache_path=os.environ.get("COURSE_CACHE_PATH", default_cache),
            tz_name=os.environ.get("TZ_NAME", "Europe/Kyiv"),
        )


class CourseStore:
    def __init__(self, source: str, cache_path: str) -> None:
        self.source = source
        self.cache_path = cache_path
        self.course: dict | None = None

    async def refresh(self) -> None:
        try:
            self.course = await asyncio.to_thread(load_course, self.source, self.cache_path)
        except CourseError as exc:
            log.error("%s", exc)


class App:
    def __init__(self, db: Database, store: CourseStore, site_url: str, tz: ZoneInfo) -> None:
        self.db = db
        self.store = store
        self.site_url = site_url
        self.tz = tz

    def now(self) -> datetime:
        return datetime.now(self.tz)


# ---------- клавіатури ----------


def time_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=t, callback_data=f"time:{t}") for t in texts.TIME_CHOICES]]
    )


def lesson_keyboard(lesson_id: int, url: str | None) -> InlineKeyboardMarkup:
    rows = []
    if url and url.startswith(("http://", "https://")):
        rows.append([InlineKeyboardButton(text=texts.OPEN_BUTTON, url=url)])
    rows.append([InlineKeyboardButton(text=texts.QUIZ_BUTTON, callback_data=f"quiz:{lesson_id}")])
    rows.append([InlineKeyboardButton(text=texts.LESSON_DONE_BUTTON, callback_data=f"done:{lesson_id}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def after_quiz_keyboard(lesson_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Ще питання", callback_data=f"quiz:{lesson_id}")],
            [InlineKeyboardButton(text=texts.LESSON_DONE_BUTTON, callback_data=f"done:{lesson_id}")],
        ]
    )


def options_keyboard(lesson_id: int, index: int, options: list[str]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"{i + 1}. {opt}", callback_data=f"ans:{lesson_id}:{index}:{i}")]
            for i, opt in enumerate(options)
        ]
    )


# ---------- щоденне повідомлення ----------


async def send_daily(bot: Bot, app: App, user: User, now: datetime) -> bool:
    """Надіслати місію дня. Повторний виклик того ж дня показує той самий день без лічильників."""
    course = app.store.course
    if course is None:
        return False
    today = now.date()
    day_number, challenge = user.day_number, user.challenge_day
    if user.last_sent_date != today:
        day_number += 1
        if next_lesson(course, user.completed) is None:
            challenge += 1
    plan = plan_daily(course, user.completed, challenge)

    if plan.kind == "lesson":
        url = full_url(course, app.site_url, plan.lesson["url"])
        await bot.send_message(
            user.chat_id,
            texts.daily_lesson(day_number, plan.lesson, url),
            reply_markup=lesson_keyboard(plan.lesson["id"], url),
        )
    elif plan.kind == "challenge":
        ref = lesson_by_id(course, plan.challenge.get("lesson", -1))
        url = full_url(course, app.site_url, ref["url"]) if ref else None
        await bot.send_message(user.chat_id, texts.daily_challenge(day_number, plan.challenge, url))
    else:
        await bot.send_message(user.chat_id, texts.ALL_DONE.format(url=full_url(course, app.site_url, "/")))

    fresh = app.db.get(user.chat_id)
    if fresh is not None:
        fresh.day_number, fresh.challenge_day, fresh.last_sent_date = day_number, challenge, today
        if plan.kind == "done":
            fresh.enabled = False
        app.db.save(fresh)
    return True


async def run_tick(bot: Bot, app: App, now: datetime) -> None:
    for user, action in plan_tick(now, app.db.all_users()):
        for attempt in range(2):
            try:
                if action == "pause":
                    await bot.send_message(user.chat_id, texts.PAUSED)
                    app.db.set_paused(user.chat_id, True)
                    app.db.mark_sent(user.chat_id, now.date())
                elif not await send_daily(bot, app, user, now):
                    log.error("Курс недоступний, пропускаю розсилку для %s", user.chat_id)
                break
            except TelegramForbiddenError:
                log.info("Користувач %s заблокував бота — вимикаю нагадування", user.chat_id)
                app.db.set_enabled(user.chat_id, False)
                break
            except TelegramRetryAfter as exc:
                if attempt == 0:
                    await asyncio.sleep(exc.retry_after)
                    continue
                log.warning("Ліміт Telegram, пропускаю %s", user.chat_id)
            except TelegramAPIError as exc:
                log.warning("Не вдалося надіслати %s: %s", user.chat_id, exc)
                break


async def reminder_loop(bot: Bot, app: App) -> None:
    last_refresh = 0.0
    loop = asyncio.get_running_loop()
    while True:
        try:
            if loop.time() - last_refresh >= COURSE_REFRESH_SECONDS:
                await app.store.refresh()
                last_refresh = loop.time()
            await run_tick(bot, app, app.now())
        except Exception:
            log.exception("Помилка в циклі розсилки")
        now = app.now()
        await asyncio.sleep(max(1.0, 60 - now.second - now.microsecond / 1_000_000))


# ---------- обробники ----------

router = Router()


def _today(app: App):
    return app.now().date()


def _streak_after_activity(app: App, user: User) -> str:
    result = register_activity(user.streak, _today(app))
    user.streak = result.streak
    if not result.changed:
        return ""
    return texts.streak_note(result.streak.count, result.comeback, result.freeze_used)


@router.message(CommandStart())
async def cmd_start(message: Message, app: App) -> None:
    user, _ = app.db.get_or_create(message.chat.id, _today(app))
    user.enabled, user.paused, user.last_reaction_date = True, False, _today(app)
    app.db.save(user)
    if user.remind_time:
        await message.answer(texts.WELCOME_BACK.format(time=user.remind_time), reply_markup=time_keyboard())
    else:
        await message.answer(texts.GREETING, reply_markup=time_keyboard())


async def _apply_time(app: App, chat_id: int, raw: str) -> str:
    hhmm = parse_time(raw)
    if hhmm is None:
        return texts.TIME_BAD_FORMAT
    if not time_allowed(hhmm):
        return texts.TIME_QUIET
    app.db.get_or_create(chat_id, _today(app))
    app.db.set_time(chat_id, hhmm)
    return texts.TIME_SET.format(time=hhmm)


@router.message(Command("time"))
async def cmd_time(message: Message, command: CommandObject, app: App) -> None:
    if not command.args:
        await message.answer(texts.TIME_HINT, reply_markup=time_keyboard())
        return
    await message.answer(await _apply_time(app, message.chat.id, command.args))


@router.callback_query(F.data.startswith("time:"))
async def cb_time(callback: CallbackQuery, app: App) -> None:
    reply = await _apply_time(app, callback.message.chat.id, callback.data.removeprefix("time:"))
    await callback.answer()
    await callback.message.answer(reply)


@router.message(Command("stop"))
async def cmd_stop(message: Message, app: App) -> None:
    app.db.set_enabled(message.chat.id, False)
    await message.answer(texts.STOPPED)


@router.message(Command("forget"))
async def cmd_forget(message: Message, app: App) -> None:
    app.db.forget(message.chat.id)
    await message.answer(texts.FORGOTTEN)


@router.message(Command("today"))
async def cmd_today(message: Message, bot: Bot, app: App) -> None:
    user = app.db.get(message.chat.id)
    if user is None:
        await message.answer(texts.NOT_SUBSCRIBED)
        return
    if app.store.course is None:
        await app.store.refresh()
    if not await send_daily(bot, app, user, app.now()):
        await message.answer(texts.COURSE_UNAVAILABLE)


def _parse_ints(data: str, prefix: str, count: int) -> list[int] | None:
    parts = data.removeprefix(prefix).split(":")
    if len(parts) != count or not all(p.isdigit() for p in parts):
        return None
    return [int(p) for p in parts]


@router.callback_query(F.data.startswith("quiz:"))
async def cb_quiz(callback: CallbackQuery, app: App) -> None:
    ids = _parse_ints(callback.data, "quiz:", 1)
    user = app.db.get(callback.message.chat.id)
    course = app.store.course
    lesson = lesson_by_id(course, ids[0]) if ids and course else None
    if user is None or lesson is None:
        await callback.answer(texts.NOT_SUBSCRIBED if user is None else texts.COURSE_UNAVAILABLE, show_alert=True)
        return
    index = pick_question(lesson, user.answered, user.quiz_turn)
    user.quiz_turn += 1
    app.db.save(user)
    await callback.answer()
    await callback.message.answer(
        texts.quiz_question(lesson, index),
        reply_markup=options_keyboard(lesson["id"], index, lesson["quiz"][index]["options"]),
    )


@router.callback_query(F.data.startswith("ans:"))
async def cb_answer(callback: CallbackQuery, app: App) -> None:
    ids = _parse_ints(callback.data, "ans:", 3)
    user = app.db.get(callback.message.chat.id)
    course = app.store.course
    lesson = lesson_by_id(course, ids[0]) if ids and course else None
    if user is None or lesson is None or ids[1] >= len(lesson["quiz"]):
        await callback.answer(texts.NOT_SUBSCRIBED if user is None else texts.COURSE_UNAVAILABLE, show_alert=True)
        return
    _, index, chosen = ids
    if chosen >= len(lesson["quiz"][index]["options"]):
        await callback.answer()
        return
    user.answered.append(quiz_key(lesson["id"], index))
    note = _streak_after_activity(app, user)
    app.db.save(user)
    text = texts.quiz_result(lesson, index, chosen)
    if note:
        text += f"\n\n{note}"
    await callback.answer()
    try:
        await callback.message.edit_text(text, reply_markup=after_quiz_keyboard(lesson["id"]))
    except TelegramBadRequest as exc:
        log.info("Не вдалося змінити повідомлення квізу: %s", exc)


@router.callback_query(F.data.startswith("done:"))
async def cb_done(callback: CallbackQuery, app: App) -> None:
    ids = _parse_ints(callback.data, "done:", 1)
    user = app.db.get(callback.message.chat.id)
    course = app.store.course
    lesson = lesson_by_id(course, ids[0]) if ids and course else None
    if user is None or lesson is None:
        await callback.answer(texts.NOT_SUBSCRIBED if user is None else texts.COURSE_UNAVAILABLE, show_alert=True)
        return
    await callback.answer()
    if lesson["id"] in user.completed:
        await callback.message.answer(texts.LESSON_ALREADY.format(id=lesson["id"]))
        return
    user.completed.append(lesson["id"])
    note = _streak_after_activity(app, user)
    app.db.save(user)
    nxt = next_lesson(course, user.completed)
    follow = texts.NEXT_UP.format(mission=nxt["mission"]) if nxt else texts.ALL_LESSONS_DONE
    lines = [texts.LESSON_MARKED.format(id=lesson["id"]), note, follow]
    await callback.message.answer("\n\n".join(line for line in lines if line))


async def reaction_middleware(handler, event, data):
    """Будь-яке повідомлення чи натискання — це реакція: оновлює дату й знімає паузу."""
    chat = data.get("event_chat")
    app: App | None = data.get("app")
    if chat is not None and app is not None:
        app.db.touch_reaction(chat.id, _today(app))
    return await handler(event, data)


def build_dispatcher(app: App) -> Dispatcher:
    dp = Dispatcher()
    dp["app"] = app
    dp.message.outer_middleware(reaction_middleware)
    dp.callback_query.outer_middleware(reaction_middleware)
    dp.include_router(router)
    return dp


async def run(config: Config) -> None:
    tz = ZoneInfo(config.tz_name)
    db = Database(config.db_path)
    store = CourseStore(config.course_source, config.cache_path)
    await store.refresh()
    app = App(db, store, config.site_url, tz)
    bot = Bot(config.token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher(app)
    loop_task = asyncio.create_task(reminder_loop(bot, app))
    try:
        await dp.start_polling(bot)
    finally:
        loop_task.cancel()
        await bot.session.close()
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    config = Config.from_env()
    if not config.token:
        sys.exit("BOT_TOKEN не задано. Заповни bot/.env (див. README) — потрібен дозвіл власника.")
    asyncio.run(run(config))


if __name__ == "__main__":
    main()
