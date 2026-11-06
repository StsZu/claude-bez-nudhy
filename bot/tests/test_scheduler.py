from datetime import date, datetime
from zoneinfo import ZoneInfo

from bez_nudhy_bot.db import User
from bez_nudhy_bot.scheduler import due_users, parse_time, plan_tick, should_pause, time_allowed

KYIV = ZoneInfo("Europe/Kyiv")
NOW = datetime(2026, 11, 6, 9, 0, 30, tzinfo=KYIV)
TODAY = NOW.date()


def user(**kw) -> User:
    base = dict(chat_id=1, remind_time="09:00", last_reaction_date=TODAY)
    base.update(kw)
    return User(**base)


def test_due_when_time_matches():
    assert [u.chat_id for u in due_users(NOW, [user()])] == [1]


def test_not_due_other_time():
    assert due_users(NOW, [user(remind_time="09:01")]) == []
    assert due_users(NOW, [user(remind_time=None)]) == []


def test_not_due_if_already_sent_today():
    assert due_users(NOW, [user(last_sent_date=TODAY)]) == []
    assert len(due_users(NOW, [user(last_sent_date=date(2026, 11, 5))])) == 1


def test_not_due_if_disabled_or_paused():
    assert due_users(NOW, [user(enabled=False)]) == []
    assert due_users(NOW, [user(paused=True)]) == []


def test_quiet_hours_never_send():
    for hh, mm in [(22, 0), (23, 30), (0, 0), (3, 15), (6, 59)]:
        now = datetime(2026, 11, 6, hh, mm, tzinfo=KYIV)
        assert due_users(now, [user(remind_time=f"{hh:02d}:{mm:02d}")]) == []
    for hh, mm in [(7, 0), (21, 59)]:
        now = datetime(2026, 11, 6, hh, mm, tzinfo=KYIV)
        assert len(due_users(now, [user(remind_time=f"{hh:02d}:{mm:02d}")])) == 1


def test_time_validation():
    assert parse_time("9:05") == "09:05"
    assert parse_time("21:59") == "21:59"
    assert parse_time("24:00") is None
    assert parse_time("abc") is None
    assert time_allowed("07:00") and time_allowed("21:59")
    assert not time_allowed("22:00") and not time_allowed("06:59")


def test_should_pause_after_three_full_days():
    last = date(2026, 11, 1)
    assert should_pause(last, date(2026, 11, 1)) is False
    assert should_pause(last, date(2026, 11, 3)) is False
    assert should_pause(last, date(2026, 11, 4)) is False  # лише 2 повні дні: 2 і 3
    assert should_pause(last, date(2026, 11, 5)) is True  # 3 повні дні: 2, 3, 4
    assert should_pause(None, date(2026, 11, 5)) is False


def test_plan_tick_sends_pause_instead_of_daily():
    stale = user(chat_id=2, last_reaction_date=date(2026, 11, 2))
    plan = {u.chat_id: action for u, action in plan_tick(NOW, [user(), stale])}
    assert plan == {1: "daily", 2: "pause"}
