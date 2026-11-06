// Правила гри — дзеркало GAME_DESIGN.md. Чисті функції: дата приходить аргументом.

export type Role = 'office' | 'manager' | 'dev';

export interface Streak {
  count: number;
  best: number;
  lastDay: string | null;
  freezes: number;
}

export interface State {
  v: 1;
  role: Role | null;
  xp: number;
  started: number[];
  done: number[];
  quiz: Record<string, boolean>;
  actions: number[];
  challenge: number[];
  badges: string[];
  streak: Streak;
  focus: boolean;
}

export const XP = { quizCorrect: 10, quizTry: 3, lessonDone: 50, action: 30, challengeDay: 20 } as const;

export const LEVELS = [
  { level: 1, name: 'Новачок', min: 0 },
  { level: 2, name: 'Відчинив двері', min: 100 },
  { level: 3, name: 'Ключник', min: 250 },
  { level: 4, name: 'Диспетчер дверей', min: 450 },
  { level: 5, name: 'Майстер автопілота', min: 700 },
  { level: 6, name: 'AI-провідник команди', min: 900 },
] as const;

export const BADGES: Record<string, { name: string; hint: string }> = {
  'first-door': { name: 'Перші двері', hint: 'Заверши будь-яку місію' },
  sniper: { name: 'Влучний', hint: 'Усі 3 питання однієї місії — з першої спроби' },
  doer: { name: 'Діяч', hint: 'Натисни «Я зробив» у будь-якій дії на 2 хв' },
  practitioner: { name: 'Практик', hint: 'Виконай 5 дій на 2 хв' },
  'streak-3': { name: 'Три дні поспіль', hint: 'Будь активним 3 дні поспіль' },
  comeback: { name: 'З поверненням', hint: 'Повернись після паузи — пауза це нормально' },
  'challenge-7': { name: 'Тиждень практики', hint: 'Відміть усі 7 днів челенджу в будь-якому порядку' },
  'route-done': { name: 'Свій маршрут', hint: 'Заверши всі рекомендовані місії своєї ролі' },
  guide: { name: 'AI-провідник', hint: 'Заверши всі 8 місій' },
};

export const ROLES: Record<Role, { name: string; order: number[]; recommended: number[] }> = {
  office: { name: 'Офіс', order: [1, 2, 4, 5, 8, 6, 7, 3], recommended: [1, 2, 4, 5, 8] },
  manager: { name: 'Менеджер', order: [1, 2, 4, 5, 6, 8, 7, 3], recommended: [1, 2, 4, 5, 6, 8] },
  dev: { name: 'Розробник', order: [1, 3, 6, 5, 2, 4, 7, 8], recommended: [1, 3, 5, 6, 8] },
};

export const ALL_LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];
export const QUIZ_PER_LESSON = 3;
export const CHALLENGE_DAYS = 7;
export const CHAOS_START = 214;
export const MAX_FREEZES = 2;

export function initialState(): State {
  return {
    v: 1,
    role: null,
    xp: 0,
    started: [],
    done: [],
    quiz: {},
    actions: [],
    challenge: [],
    badges: [],
    streak: { count: 0, best: 0, lastDay: null, freezes: 1 },
    focus: false,
  };
}

const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const nums = (a: unknown, ok: (n: number) => boolean) =>
  Array.isArray(a) ? [...new Set(a.filter((n): n is number => Number.isInteger(n) && ok(n)))] : [];
const nonNeg = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

/** Приводить будь-які збережені дані до коректного стану; сміття → початковий стан. */
export function normalize(raw: unknown): State {
  const base = initialState();
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return base;
  const r = raw as Record<string, unknown>;
  const lesson = (n: number) => n >= 1 && n <= 8;
  const quiz: Record<string, boolean> = {};
  if (r.quiz && typeof r.quiz === 'object') {
    for (const [k, val] of Object.entries(r.quiz as Record<string, unknown>)) {
      if (/^[1-8]-[0-2]$/.test(k) && typeof val === 'boolean') quiz[k] = val;
    }
  }
  const s = (r.streak ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    role: r.role === 'office' || r.role === 'manager' || r.role === 'dev' ? r.role : null,
    xp: nonNeg(r.xp),
    started: nums(r.started, lesson),
    done: nums(r.done, lesson),
    quiz,
    actions: nums(r.actions, lesson),
    challenge: nums(r.challenge, (n) => n >= 1 && n <= CHALLENGE_DAYS),
    badges: Array.isArray(r.badges) ? [...new Set(r.badges.filter((b): b is string => typeof b === 'string' && b in BADGES))] : [],
    streak: {
      count: nonNeg(s.count),
      best: Math.max(nonNeg(s.best), nonNeg(s.count)),
      lastDay: isDay(s.lastDay) ? s.lastDay : null,
      freezes: Math.min(MAX_FREEZES, typeof s.freezes === 'number' ? nonNeg(s.freezes) : 1),
    },
    focus: r.focus === true,
  };
}

export function levelFor(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) current = l;
  const next = LEVELS.find((l) => l.min > xp) ?? null;
  return { ...current, next, toNext: next ? next.min - xp : 0 };
}

/** Кількість днів від a до b (YYYY-MM-DD), без впливу часових поясів. */
export function dayDiff(a: string, b: string): number {
  const t = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

export interface StreakResult {
  streak: Streak;
  comeback: boolean;
  frozeDays: number;
}

export function registerActivity(streak: Streak, today: string): StreakResult {
  const s = { ...streak };
  let comeback = false;
  let frozeDays = 0;
  if (s.lastDay === null) {
    s.count = 1;
  } else {
    const diff = dayDiff(s.lastDay, today);
    if (diff <= 0) return { streak: s, comeback, frozeDays };
    const missed = diff - 1;
    if (missed === 0) {
      s.count += 1;
    } else if (missed <= s.freezes) {
      s.freezes -= missed;
      frozeDays = missed;
      s.count += 1;
    } else {
      s.count = 1;
      comeback = missed >= 2;
    }
  }
  if (s.count % 3 === 0) s.freezes = Math.min(MAX_FREEZES, s.freezes + 1);
  s.best = Math.max(s.best, s.count);
  s.lastDay = today;
  return { streak: s, comeback, frozeDays };
}

export type GameEvent =
  | { type: 'start'; lesson: number }
  | { type: 'quiz'; lesson: number; q: number; correct: boolean }
  | { type: 'action'; lesson: number }
  | { type: 'lessonDone'; lesson: number }
  | { type: 'challenge'; day: number };

export interface ApplyResult {
  state: State;
  gained: number;
  newBadges: string[];
  firstTime: boolean;
  frozeDays: number;
  comeback: boolean;
}

export function apply(prev: State, ev: GameEvent, today: string): ApplyResult {
  const state: State = structuredClone(prev);
  let gained = 0;
  let firstTime = false;
  let activity = false;

  switch (ev.type) {
    case 'start':
      if (!state.started.includes(ev.lesson)) {
        state.started.push(ev.lesson);
        firstTime = true;
      }
      break;
    case 'quiz': {
      const key = `${ev.lesson}-${ev.q}`;
      if (!(key in state.quiz)) {
        state.quiz[key] = ev.correct;
        gained = ev.correct ? XP.quizCorrect : XP.quizTry;
        firstTime = true;
      }
      break;
    }
    case 'action':
      if (!state.actions.includes(ev.lesson)) {
        state.actions.push(ev.lesson);
        gained = XP.action;
        firstTime = true;
        activity = true;
      }
      break;
    case 'lessonDone':
      if (!state.started.includes(ev.lesson)) state.started.push(ev.lesson);
      if (!state.done.includes(ev.lesson)) {
        state.done.push(ev.lesson);
        gained = XP.lessonDone;
        firstTime = true;
        activity = true;
      }
      break;
    case 'challenge':
      if (!state.challenge.includes(ev.day)) {
        state.challenge.push(ev.day);
        gained = XP.challengeDay;
        firstTime = true;
        activity = true;
      }
      break;
  }

  state.xp += gained;
  let comeback = false;
  let frozeDays = 0;
  if (activity) {
    const r = registerActivity(state.streak, today);
    state.streak = r.streak;
    comeback = r.comeback;
    frozeDays = r.frozeDays;
  }

  const earned = new Set(state.badges);
  const award = (id: string, cond: boolean) => {
    if (cond && !earned.has(id)) {
      earned.add(id);
      state.badges.push(id);
    }
  };
  award('first-door', state.done.length >= 1);
  award(
    'sniper',
    state.done.some((l) => [0, 1, 2].every((q) => state.quiz[`${l}-${q}`] === true)),
  );
  award('doer', state.actions.length >= 1);
  award('practitioner', state.actions.length >= 5);
  award('streak-3', state.streak.count >= 3);
  award('comeback', comeback);
  award('challenge-7', state.challenge.length >= CHALLENGE_DAYS);
  award('route-done', state.role !== null && ROLES[state.role].recommended.every((l) => state.done.includes(l)));
  award('guide', ALL_LESSONS.every((l) => state.done.includes(l)));

  const newBadges = state.badges.filter((b) => !prev.badges.includes(b));
  return { state, gained, newBadges, firstTime, frozeDays, comeback };
}

export function setRole(prev: State, role: Role | null): State {
  const state = { ...prev, role, badges: [...prev.badges] };
  if (role && !state.badges.includes('route-done') && ROLES[role].recommended.every((l) => state.done.includes(l))) {
    state.badges.push('route-done');
  }
  return state;
}

export function chaosLeft(state: State, chaosByLesson: Record<number, number>): number {
  const cleared = state.done.reduce((sum, l) => sum + (chaosByLesson[l] ?? 0), 0);
  return Math.max(0, CHAOS_START - cleared);
}

export function lessonOrder(role: Role | null): number[] {
  return role ? ROLES[role].order : ALL_LESSONS;
}

export function nextLesson(state: State): number | null {
  return lessonOrder(state.role).find((l) => !state.done.includes(l)) ?? null;
}
