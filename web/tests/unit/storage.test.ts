import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apply, initialState } from '../../src/lib/game';
import { _reset, isPersistent, KEY, load, save } from '../../src/lib/storage';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe('storage', () => {
  beforeEach(() => {
    _reset();
    vi.unstubAllGlobals();
  });

  it('зберігає й читає стан', () => {
    const ls = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    const st = apply(initialState(), { type: 'lessonDone', lesson: 1 }, '2026-11-06').state;
    save(st);
    expect(load()).toEqual(st);
    expect(isPersistent()).toBe(true);
  });

  it('пошкоджений JSON → початковий стан без помилки', () => {
    const ls = fakeStorage();
    ls.m.set(KEY, '{не json');
    vi.stubGlobal('localStorage', ls);
    expect(load()).toEqual(initialState());
  });

  it('сховище кидає помилки → працює в пам\'яті, isPersistent=false', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    });
    const st = apply(initialState(), { type: 'action', lesson: 2 }, '2026-11-06').state;
    save(st);
    expect(load()).toEqual(st);
    expect(isPersistent()).toBe(false);
  });
});
