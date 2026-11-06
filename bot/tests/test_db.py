from datetime import date

from bez_nudhy_bot.db import Database
from bez_nudhy_bot.game import Streak

TODAY = date(2026, 11, 6)


def test_create_save_roundtrip(tmp_path):
    db = Database(tmp_path / "data" / "bot.sqlite3")
    user, created = db.get_or_create(42, TODAY)
    assert created and user.enabled and not user.paused
    assert user.streak == Streak()
    user.completed = [2, 1, 2]
    user.answered = ["1:0"]
    user.streak = Streak(count=3, best=4, last_day=TODAY, freezes=2)
    db.save(user)
    again = db.get(42)
    assert again.completed == [1, 2]
    assert again.answered == ["1:0"]
    assert again.streak == Streak(count=3, best=4, last_day=TODAY, freezes=2)
    assert db.get_or_create(42, TODAY)[1] is False


def test_time_enable_pause_sent_reaction():
    db = Database()
    db.get_or_create(1, TODAY)
    db.set_paused(1, True)
    db.set_enabled(1, False)
    db.set_time(1, "09:00")
    u = db.get(1)
    assert u.remind_time == "09:00" and u.enabled and not u.paused
    db.set_paused(1, True)
    db.touch_reaction(1, date(2026, 11, 7))
    db.mark_sent(1, TODAY)
    u = db.get(1)
    assert not u.paused and u.last_reaction_date == date(2026, 11, 7) and u.last_sent_date == TODAY


def test_forget_removes_row():
    db = Database()
    db.get_or_create(7, TODAY)
    db.get_or_create(8, TODAY)
    assert db.forget(7) is True
    assert db.get(7) is None
    assert db.conn.execute("SELECT COUNT(*) FROM users WHERE chat_id = 7").fetchone()[0] == 0
    assert db.get(8) is not None
    assert db.forget(7) is False
