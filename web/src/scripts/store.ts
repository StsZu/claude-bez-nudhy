import { apply, initialState, setRole as setRoleRule, type ApplyResult, type GameEvent, type Role, type State, BADGES } from '../lib/game';
import { clear, isPersistent, load, save } from '../lib/storage';

interface Meta {
  lessons: Record<string, { title: string; mission: string; chaos: number; url: string }>;
  progressUrl: string;
}

export const meta: Meta = JSON.parse(document.getElementById('course-meta')?.textContent || '{"lessons":{}}');
export const chaosByLesson: Record<number, number> = Object.fromEntries(
  Object.entries(meta.lessons).map(([k, v]) => [Number(k), v.chaos]),
);

let state: State = load();
const listeners = new Set<(s: State) => void>();

export const getState = () => state;
export const persistent = () => isPersistent();

export function subscribe(fn: (s: State) => void): void {
  listeners.add(fn);
  fn(state);
}

function commit(next: State): void {
  state = next;
  save(state);
  listeners.forEach((fn) => fn(state));
}

const pad = (n: number) => String(n).padStart(2, '0');
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dispatch(ev: GameEvent): ApplyResult {
  const r = apply(state, ev, today());
  commit(r.state);
  if (r.comeback) toast("З поверненням! Продовжуємо з того місця, де ти зупинився.");
  if (r.frozeDays > 0) toast('Заморозка зберегла твою серію днів.');
  if (r.gained > 0) toast(`+${r.gained} XP`);
  r.newBadges.forEach((b) => toast(`Новий бейдж: «${BADGES[b].name}»`));
  return r;
}

export function setRole(role: Role | null): void {
  const before = state.badges.length;
  commit(setRoleRule(state, role));
  if (state.badges.length > before) toast(`Новий бейдж: «${BADGES['route-done'].name}»`);
}

export function setFocus(on: boolean): void {
  commit({ ...state, focus: on });
}

export function resetAll(): void {
  clear();
  commit(initialState());
}

const queue: string[] = [];
let showing = false;
export function toast(msg: string): void {
  queue.push(msg);
  if (!showing) next();
}
function next(): void {
  const el = document.getElementById('toast');
  const msg = queue.shift();
  if (!el || !msg) {
    showing = false;
    return;
  }
  showing = true;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
    setTimeout(next, 150);
  }, 2600);
}
