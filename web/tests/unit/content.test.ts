import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadChallenge, loadDoors, loadLessons } from '../../src/lib/content';

const REAL = path.resolve(__dirname, '../../../content');

describe('контент курсу', () => {
  const lessons = loadLessons();

  it('8 уроків, у кожному 3 питання з поясненням', () => {
    expect(lessons.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const l of lessons) {
      expect(l.quiz).toHaveLength(3);
      for (const q of l.quiz) expect(q.why.length).toBeGreaterThan(10);
    }
  });

  it('хаос-метр сумується в 214', () => {
    expect(lessons.reduce((s, l) => s + l.chaos, 0)).toBe(214);
  });

  it('челендж 7 днів і шпаргалка', () => {
    expect(loadChallenge()).toHaveLength(7);
    expect(loadDoors().length).toBeGreaterThanOrEqual(10);
  });
});

describe('людські помилки збірки', () => {
  function brokenCopy(mutate: (src: string) => string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bn-'));
    fs.cpSync(REAL, dir, { recursive: true });
    const f = path.join(dir, 'lessons', '02-chat.md');
    fs.writeFileSync(f, mutate(fs.readFileSync(f, 'utf8')));
    return dir;
  }

  it('без tldr → назва файлу й поля', () => {
    const dir = brokenCopy((s) => s.replace(/^tldr:.*\n/m, ''));
    expect(() => loadLessons(dir)).toThrow(/content\/lessons\/02-chat\.md[\s\S]*tldr/);
  });

  it('answer поза варіантами → зрозуміле повідомлення', () => {
    const dir = brokenCopy((s) => s.replace('    answer: 0', '    answer: 7'));
    expect(() => loadLessons(dir)).toThrow(/answer=7/);
  });

  it('двокрапка без лапок → порада про лапки', () => {
    const dir = brokenCopy((s) => s.replace('title: "Чат: швидкий старт"', 'title: Чат: швидкий старт'));
    expect(() => loadLessons(dir)).toThrow(/лапки/);
  });
});
