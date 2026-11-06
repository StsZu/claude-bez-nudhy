from datetime import date, timedelta

from bez_nudhy_bot.game import MAX_FREEZES, Streak, register_activity

D0 = date(2026, 11, 2)


def run(days: list[date], start: Streak | None = None):
    s = start or Streak()
    results = []
    for d in days:
        r = register_activity(s, d)
        s = r.streak
        results.append(r)
    return s, results


def test_initial_state():
    s = Streak()
    assert (s.count, s.best, s.last_day, s.freezes) == (0, 0, None, 1)


def test_first_activity_gives_count_1():
    r = register_activity(Streak(), D0)
    assert r.streak.count == 1
    assert r.streak.best == 1
    assert r.streak.last_day == D0
    assert r.comeback is False


def test_next_day_increments():
    s, _ = run([D0, D0 + timedelta(days=1)])
    assert s.count == 2


def test_same_day_no_change():
    s, results = run([D0, D0])
    assert s.count == 1
    assert results[-1].changed is False


def test_earlier_date_no_change():
    s, _ = run([D0, D0 + timedelta(days=1)])
    r = register_activity(s, D0 - timedelta(days=3))
    assert r.streak == s
    assert r.changed is False


def test_miss_one_day_uses_freeze():
    s, results = run([D0, D0 + timedelta(days=2)])
    assert s.count == 2
    assert s.freezes == 0
    assert results[-1].freeze_used is True
    assert results[-1].comeback is False


def test_miss_five_days_resets_with_comeback():
    s, results = run([D0, D0 + timedelta(days=1), D0 + timedelta(days=7)])
    assert s.count == 1
    assert results[-1].comeback is True


def test_miss_thirty_days_resets_with_comeback():
    s, results = run([D0, D0 + timedelta(days=31)])
    assert s.count == 1
    assert results[-1].comeback is True


def test_miss_one_day_without_freezes_resets_without_comeback():
    r = register_activity(Streak(count=4, best=4, last_day=D0, freezes=0), D0 + timedelta(days=2))
    assert r.streak.count == 1
    assert r.comeback is False


def test_count_3_grants_freeze_capped_at_2():
    s, _ = run([D0 + timedelta(days=i) for i in range(3)])
    assert s.count == 3
    assert s.freezes == 2
    s, _ = run([D0 + timedelta(days=i) for i in range(9)])
    assert s.count == 9
    assert s.freezes == MAX_FREEZES


def test_best_never_decreases():
    days = [D0 + timedelta(days=i) for i in range(5)] + [D0 + timedelta(days=20), D0 + timedelta(days=21)]
    s, results = run(days)
    bests = [r.streak.best for r in results]
    assert bests == sorted(bests)
    assert s.best == 5
    assert s.count == 2
