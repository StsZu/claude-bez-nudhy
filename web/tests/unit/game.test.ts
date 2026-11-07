import { describe, expect, it } from 'vitest';
import {
  ALL_LESSONS,
  apply,
  chaosLeft,
  initialState,
  levelFor,
  nextLesson,
  normalize,
  registerActivity,
  setRole,
  type State,
  type Streak,
} from '../../src/lib/game';

const fresh: Streak = { count: 0, best: 0, lastDay: null, freezes: 1 };

describe('серія днів (GAME_DESIGN: Серія днів із заморозкою)', () => {
  it('перша активність → 1', () => {
    expect(registerActivity(fresh, '2026-11-06').streak).toMatchObject({ count: 1, best: 1, lastDay: '2026-11-06' });
  });

  it('наступний день → +1', () => {
    const s = registerActivity(fresh, '2026-11-06').streak;
    expect(registerActivity(s, '2026-11-07').streak.count).toBe(2);
  });

  it('той самий день і дата назад нічого не змінюють', () => {
    const s = { count: 2, best: 2, lastDay: '2026-11-07', freezes: 1 };
    expect(registerActivity(s, '2026-11-07').streak).toEqual(s);
    expect(registerActivity(s, '2026-11-01').streak).toEqual(s);
  });

  it('пропуск 1 дня з 1 заморозкою — серія триває, заморозка витрачена', () => {
    const r = registerActivity({ count: 1, best: 1, lastDay: '2026-11-06', freezes: 1 }, '2026-11-08');
    expect(r.streak).toMatchObject({ count: 2, freezes: 0 });
    expect(r.frozeDays).toBe(1);
    expect(r.comeback).toBe(false);
  });

  it('пропуск 5 днів — серія з 1, comeback, best не зменшується', () => {
    const r = registerActivity({ count: 4, best: 4, lastDay: '2026-11-01', freezes: 2 }, '2026-11-07');
    expect(r.streak).toMatchObject({ count: 1, best: 4 });
    expect(r.comeback).toBe(true);
  });

  it('пропуск 30 днів — comeback', () => {
    const r = registerActivity({ count: 2, best: 2, lastDay: '2026-10-01', freezes: 0 }, '2026-10-31');
    expect(r.streak.count).toBe(1);
    expect(r.comeback).toBe(true);
  });

  it('пропуск 1 дня без заморозок — серія з 1, але без comeback (пауза < 2 днів)', () => {
    const r = registerActivity({ count: 2, best: 2, lastDay: '2026-11-06', freezes: 0 }, '2026-11-08');
    expect(r.streak.count).toBe(1);
    expect(r.comeback).toBe(false);
  });

  it('кожні 3 дні +1 заморозка, але не більше 2', () => {
    let s: Streak = { count: 2, best: 2, lastDay: '2026-11-06', freezes: 2 };
    s = registerActivity(s, '2026-11-07').streak;
    expect(s).toMatchObject({ count: 3, freezes: 2 });
    s = { count: 2, best: 2, lastDay: '2026-11-06', freezes: 0 };
    expect(registerActivity(s, '2026-11-07').streak.freezes).toBe(1);
  });

  it('межа місяця і року', () => {
    const s = { count: 1, best: 1, lastDay: '2026-12-31', freezes: 1 };
    expect(registerActivity(s, '2027-01-01').streak.count).toBe(2);
  });
});

describe('XP, бейджі, хаос', () => {
  const T = '2026-11-06';

  it('квіз: XP лише за першу спробу', () => {
    let st = initialState();
    let r = apply(st, { type: 'quiz', lesson: 1, q: 0, correct: false }, T);
    expect(r.gained).toBe(3);
    st = r.state;
    r = apply(st, { type: 'quiz', lesson: 1, q: 0, correct: true }, T);
    expect(r.gained).toBe(0);
    expect(r.state.xp).toBe(3);
  });

  it('дія й завершення — один раз', () => {
    let st = apply(initialState(), { type: 'action', lesson: 2 }, T).state;
    st = apply(st, { type: 'action', lesson: 2 }, T).state;
    expect(st.xp).toBe(30);
    st = apply(st, { type: 'lessonDone', lesson: 2 }, T).state;
    st = apply(st, { type: 'lessonDone', lesson: 2 }, T).state;
    expect(st.xp).toBe(80);
    expect(st.badges).toEqual(expect.arrayContaining(['doer', 'first-door']));
  });

  it('влучний — усі 3 питання з першої спроби в завершеному уроці', () => {
    let st = initialState();
    for (const q of [0, 1, 2]) st = apply(st, { type: 'quiz', lesson: 4, q, correct: true }, T).state;
    expect(st.badges).not.toContain('sniper');
    const r = apply(st, { type: 'lessonDone', lesson: 4 }, T);
    expect(r.newBadges).toContain('sniper');
  });

  it('максимум 1020 XP і всі бейджі без comeback', () => {
    let st = setRole(initialState(), 'office');
    let day = 1;
    const d = () => `2026-11-${String(day).padStart(2, '0')}`;
    for (const l of ALL_LESSONS) {
      for (const q of [0, 1, 2]) st = apply(st, { type: 'quiz', lesson: l, q, correct: true }, d()).state;
      st = apply(st, { type: 'action', lesson: l }, d()).state;
      st = apply(st, { type: 'lessonDone', lesson: l }, d()).state;
      day++;
    }
    for (let c = 1; c <= 7; c++) st = apply(st, { type: 'challenge', day: c }, d()).state;
    expect(st.xp).toBe(1020);
    expect(levelFor(st.xp).name).toBe('ШІ-провідник команди');
    expect(st.badges.sort()).toEqual(
      ['challenge-7', 'doer', 'first-door', 'guide', 'practitioner', 'route-done', 'sniper', 'streak-3'].sort(),
    );
    expect(chaosLeft(st, { 1: 20, 2: 40, 3: 20, 4: 40, 5: 30, 6: 34, 7: 10, 8: 20 })).toBe(0);
  });

  it('пропуск 1–30 днів не зменшує XP і бейджі', () => {
    let st = apply(initialState(), { type: 'lessonDone', lesson: 1 }, '2026-11-01').state;
    for (const gap of [1, 2, 5, 30]) {
      const before = { xp: st.xp, badges: [...st.badges], done: [...st.done] };
      const last = st.streak.lastDay!;
      const dt = new Date(Date.UTC(+last.slice(0, 4), +last.slice(5, 7) - 1, +last.slice(8, 10) + gap + 1));
      const today = dt.toISOString().slice(0, 10);
      const r = apply(st, { type: 'challenge', day: Math.min(7, gap) }, today);
      expect(r.state.xp).toBeGreaterThanOrEqual(before.xp);
      expect(r.state.badges).toEqual(expect.arrayContaining(before.badges));
      expect(r.state.done).toEqual(expect.arrayContaining(before.done));
      st = r.state;
    }
    expect(st.badges).toContain('comeback');
  });

  it('челендж: будь-який день, XP один раз', () => {
    let st = apply(initialState(), { type: 'challenge', day: 5 }, T).state;
    st = apply(st, { type: 'challenge', day: 5 }, T).state;
    expect(st.xp).toBe(20);
    expect(st.challenge).toEqual([5]);
  });

  it('роль змінює наступну місію, route-done при виборі ролі після проходження', () => {
    let st: State = initialState();
    for (const l of [1, 3, 5, 6, 8]) st = apply(st, { type: 'lessonDone', lesson: l }, T).state;
    expect(nextLesson(st)).toBe(2);
    st = setRole(st, 'dev');
    expect(st.badges).toContain('route-done');
    expect(nextLesson(st)).toBe(2);
    st = setRole(st, 'office');
    expect(nextLesson(st)).toBe(2);
  });
});

describe('normalize — пошкоджені дані', () => {
  it('сміття → початковий стан', () => {
    for (const bad of [null, 42, 'x', [], { v: 2 }, { v: '1' }]) expect(normalize(bad)).toEqual(initialState());
  });

  it('фільтрує неправильні поля, але зберігає правильні', () => {
    const st = normalize({
      v: 1,
      xp: -5,
      done: [1, 1, 9, 'x', 3],
      quiz: { '1-0': true, '9-9': true, '2-1': 'yes' },
      badges: ['guide', 'fake'],
      role: 'boss',
      streak: { count: 3, best: 1, lastDay: 'вчора', freezes: 7 },
    });
    expect(st.xp).toBe(0);
    expect(st.done).toEqual([1, 3]);
    expect(st.quiz).toEqual({ '1-0': true });
    expect(st.badges).toEqual(['guide']);
    expect(st.role).toBeNull();
    expect(st.streak).toEqual({ count: 3, best: 3, lastDay: null, freezes: 2 });
  });
});
