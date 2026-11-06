import { initialState, normalize, type State } from './game';

export const KEY = 'bez-nudhy:v1';

let memory: string | null = null;
let persistent = true;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function store(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Чи зберігається прогрес між сесіями (false — приватний режим, заборона сховища). */
export function isPersistent(): boolean {
  return persistent;
}

export function load(): State {
  let raw: string | null = memory;
  try {
    const s = store();
    if (!s) throw new Error('no storage');
    raw = s.getItem(KEY) ?? memory;
  } catch {
    persistent = false;
  }
  if (!raw) return initialState();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return initialState();
  }
}

export function save(state: State): void {
  const raw = JSON.stringify(state);
  memory = raw;
  try {
    const s = store();
    if (!s) throw new Error('no storage');
    s.setItem(KEY, raw);
  } catch {
    persistent = false;
  }
}

export function clear(): void {
  memory = null;
  try {
    store()?.removeItem(KEY);
  } catch {
    persistent = false;
  }
}

/** Лише для тестів. */
export function _reset(): void {
  memory = null;
  persistent = true;
}
