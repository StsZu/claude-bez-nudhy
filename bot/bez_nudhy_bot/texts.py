"""Усі тексти бота українською. Без сорому й без штучного поспіху (конституція, NN-02)."""

from __future__ import annotations

from html import escape

TIME_CHOICES = ("08:00", "09:00", "12:00", "18:00", "20:00")

GREETING = (
    "Привіт! Я нагадувач курсу «Claude без нудьги».\n\n"
    "Раз на день надішлю одну місію на 5 хвилин і міні-квіз. Не більше одного повідомлення на день "
    "і ніколи вночі.\n\n"
    "Коли тобі зручно? Обери час нижче або напиши свій: <code>/time 07:30</code> (з 07:00 до 21:59 за Києвом).\n\n"
    "Вимкнути нагадування — /stop. Видалити всі дані — /forget. Місія просто зараз — /today."
)

WELCOME_BACK = (
    "З поверненням! Усе збережено: пройдені уроки й серія на місці.\n"
    "Нагадую о {time}. Змінити — <code>/time HH:MM</code>, місія зараз — /today."
)

TIME_SET = "Готово, нагадуватиму щодня о {time} за Києвом. Місія просто зараз — /today."
TIME_HINT = "Обери час кнопкою або напиши, наприклад, <code>/time 07:30</code>."
TIME_BAD_FORMAT = "Не впізнав час. Напиши у форматі ГГ:ХХ, наприклад <code>/time 09:30</code>."
TIME_QUIET = "Вночі я мовчу, щоб не будити. Обери час з 07:00 до 21:59, наприклад <code>/time 21:00</code>."

STOPPED = "Нагадування вимкнено. Прогрес збережено. Захочеш знову — /start."
FORGOTTEN = "Усі твої дані видалено. Якщо захочеш повернутися — /start, почнемо спочатку."
NOT_SUBSCRIBED = "Спершу напиши /start — і обери зручний час."

PAUSED = "Ставлю нагадування на паузу. Повернешся — напиши /start, усе збережено."

COURSE_UNAVAILABLE = "Зараз не можу відкрити матеріали курсу. Спробуй трохи пізніше — /today."

QUIZ_BUTTON = "Міні-квіз"
LESSON_DONE_BUTTON = "Урок пройдено"
OPEN_BUTTON = "Відкрити місію"

CORRECT = "✅ Так!"
WRONG = "❌ Не зовсім. Правильна відповідь: {answer}"

STREAK_LINE = "Серія: {count} дн. поспіль."
FREEZE_USED = "Заморозка зберегла серію."
COMEBACK = "З поверненням! Продовжуємо з того самого місця."

LESSON_MARKED = "Урок {id} позначено як пройдений. Так тримати!"
LESSON_ALREADY = "Урок {id} уже позначено як пройдений."
NEXT_UP = "Наступна місія: «{mission}». Прийде в повідомленні в обраний час або одразу — /today."
ALL_LESSONS_DONE = (
    "Усі 8 місій пройдено! Далі — 7 днів практики: по одному короткому завданню в обраний час."
)

ALL_DONE = (
    "Усі 8 місій і 7 днів практики пройдено. Це великий шлях!\n"
    "Нагадування на цьому зупиняю. Шпаргалка й промпти лишаються на сайті: {url}\n"
    "Захочеш почати ще раз — /start."
)


def daily_lesson(day: int, lesson: dict, url: str) -> str:
    parts = [f"<b>День {day} · {lesson.get('minutes', 5)} хвилин:</b> місія «{escape(lesson['mission'])}»"]
    if lesson.get("tldr"):
        parts.append(escape(lesson["tldr"]))
    parts.append(f"Відкрити: {escape(url)}")
    return "\n\n".join(parts)


def daily_challenge(day: int, item: dict, url: str | None) -> str:
    text = f"<b>День {day} · практика {item['day']} з 7:</b> {escape(item['text'])}"
    if url:
        text += f"\n\nПідказка в уроці: {escape(url)}"
    return text


def quiz_question(lesson: dict, index: int) -> str:
    q = lesson["quiz"][index]
    options = "\n".join(f"{i + 1}. {escape(opt)}" for i, opt in enumerate(q["options"]))
    return f"<b>Міні-квіз · урок {lesson['id']}</b>\n\n{escape(q['q'])}\n\n{options}"


def quiz_result(lesson: dict, index: int, chosen: int) -> str:
    q = lesson["quiz"][index]
    head = CORRECT if chosen == q["answer"] else WRONG.format(answer=escape(q["options"][q["answer"]]))
    return f"{quiz_question(lesson, index)}\n\n{head}\n{escape(q['why'])}"


def streak_note(count: int, comeback: bool, freeze_used: bool) -> str:
    if comeback:
        return COMEBACK
    line = STREAK_LINE.format(count=count)
    return f"{FREEZE_USED} {line}" if freeze_used else line


ALL_TEXTS = [
    GREETING,
    WELCOME_BACK,
    TIME_SET,
    TIME_HINT,
    TIME_BAD_FORMAT,
    TIME_QUIET,
    STOPPED,
    FORGOTTEN,
    NOT_SUBSCRIBED,
    PAUSED,
    COURSE_UNAVAILABLE,
    QUIZ_BUTTON,
    LESSON_DONE_BUTTON,
    OPEN_BUTTON,
    CORRECT,
    WRONG,
    STREAK_LINE,
    FREEZE_USED,
    COMEBACK,
    LESSON_MARKED,
    LESSON_ALREADY,
    NEXT_UP,
    ALL_LESSONS_DONE,
    ALL_DONE,
]
