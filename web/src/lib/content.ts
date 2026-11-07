// Читає контент з ../content на етапі збірки й перевіряє його.
// Помилки пишуться людською мовою: файл, поле, що не так.
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import YAML from 'yaml';
import { z } from 'zod';

// Команди запускаються з теки web/, контент лежить поруч: ../content.
const CONTENT_DIR = process.env.CONTENT_DIR || path.resolve(process.cwd(), '..', 'content');

const text = (name: string) => z.string({ error: `потрібен текст (${name})` }).trim().min(1, `«${name}» не може бути порожнім`);

const QuizItem = z.object({
  q: text('питання'),
  options: z.array(text('варіант')).min(2, 'потрібно 2–4 варіанти').max(4, 'потрібно 2–4 варіанти'),
  answer: z.number({ error: 'answer — номер правильного варіанта, рахуючи з 0' }).int().min(0),
  why: text('пояснення'),
});

const LessonMeta = z.object({
  id: z.number({ error: 'id — число від 1 до 8' }).int().min(1).max(8),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug — лише латиниця, цифри й дефіс'),
  title: text('назва'),
  mission: text('місія'),
  minutes: z.number({ error: 'minutes — число від 1 до 5' }).int().min(1).max(5),
  chaos: z.number({ error: 'chaos — скільки листів закриває місія' }).int().min(0),
  audience: z.string().optional(),
  hook: text('hook'),
  tldr: text('одне речення'),
  demo: z.object({
    diagram: z.enum(['doors-map', 'doors-filter']).optional(),
    caption: z.string().optional(),
    gif: z.string().optional(),
    todo: z.string().optional(),
  }),
  quiz: z.array(QuizItem).length(3, 'у квізі має бути рівно 3 питання'),
  action: z.object({ text: text('текст дії'), prompt: text('промпт'), example: z.string().min(1).optional() }),
  examples: z.array(z.string().min(1)).optional(),
});

export type LessonMetaT = z.infer<typeof LessonMeta>;
export interface Card {
  title: string;
  html: string;
}
export interface Lesson extends LessonMetaT {
  file: string;
  cards: Card[];
  words: number;
}

const ChallengeDay = z.object({ day: z.number().int().min(1).max(7), text: text('дія дня'), lesson: z.number().int().min(1).max(8) });
const Door = z.object({ want: text('хочу'), door: text('двері'), lesson: z.number().int().min(1).max(8), tags: z.array(z.string()).optional() });
export type ChallengeDayT = z.infer<typeof ChallengeDay>;
export type DoorT = z.infer<typeof Door>;

const marked = new Marked({ gfm: true });

function fail(file: string, error: z.ZodError): never {
  const lines = error.issues.map((i) => {
    const where = i.path.length ? i.path.join(' → ') : '(весь файл)';
    return `  • поле «${where}»: ${i.message}`;
  });
  throw new Error(`\n\nПомилка в файлі content/${file}:\n${lines.join('\n')}\nДив. README → «Як змінити урок».\n`);
}

function splitFrontmatter(file: string, raw: string): { meta: unknown; body: string } {
  const m = raw.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`\n\nПомилка в файлі content/${file}: шапка має починатися й закінчуватися рядком ---\n`);
  try {
    return { meta: YAML.parse(m[1]), body: m[2] };
  } catch (e) {
    throw new Error(`\n\nПомилка в шапці файлу content/${file}: ${(e as Error).message}\nПорада: якщо текст містить двокрапку, візьми його в лапки.\n`);
  }
}

export function countWords(s: string): number {
  return (s.replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
}

function splitCards(body: string): Card[] {
  const parts = body.split(/^##\s+/m).slice(1);
  return parts.map((part) => {
    const nl = part.indexOf('\n');
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    const md = nl === -1 ? '' : part.slice(nl + 1).trim();
    return { title, html: marked.parse(md, { async: false }) as string };
  });
}

export function loadLessons(dir = CONTENT_DIR): Lesson[] {
  const lessonsDir = path.join(dir, 'lessons');
  const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.md')).sort();
  const lessons = files.map((f) => {
    const file = `lessons/${f}`;
    const { meta, body } = splitFrontmatter(file, fs.readFileSync(path.join(lessonsDir, f), 'utf8'));
    const parsed = LessonMeta.safeParse(meta);
    if (!parsed.success) fail(file, parsed.error);
    const data = parsed.data;
    data.quiz.forEach((q, i) => {
      if (q.answer >= q.options.length) {
        throw new Error(`\n\nПомилка в файлі content/${file}: у питанні ${i + 1} answer=${q.answer}, а варіантів ${q.options.length} (рахуємо з 0).\n`);
      }
    });
    const cards = splitCards(body);
    if (cards.length < 1 || cards.length > 3) {
      throw new Error(`\n\nПомилка в файлі content/${file}: потрібно від 1 до 3 карток-ідей (заголовки «## …»), зараз ${cards.length}.\n`);
    }
    const quizWords = data.quiz.map((q) => [q.q, ...q.options, q.why].join(' ')).join(' ');
    const words = countWords([data.hook, data.tldr, body, data.action.text, quizWords, data.demo.caption ?? ''].join(' '));
    return { ...data, file, cards, words };
  });
  const ids = lessons.map((l) => l.id).sort((a, b) => a - b);
  if (ids.join() !== '1,2,3,4,5,6,7,8') {
    throw new Error(`\n\nУ content/lessons мають бути уроки з id 1–8 без повторів, зараз: ${ids.join(', ')}\n`);
  }
  return lessons.sort((a, b) => a.id - b.id);
}

function loadYaml<T>(file: string, schema: z.ZodType<T>, dir = CONTENT_DIR): T[] {
  let data: unknown;
  try {
    data = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (e) {
    throw new Error(`\n\nПомилка в файлі content/${file}: ${(e as Error).message}\n`);
  }
  const parsed = z.array(schema).safeParse(data);
  if (!parsed.success) fail(file, parsed.error);
  return parsed.data;
}

export const loadChallenge = (dir?: string) => {
  const days = loadYaml('challenge.yaml', ChallengeDay, dir);
  if (days.length !== 7) throw new Error(`\n\ncontent/challenge.yaml: потрібно рівно 7 днів, зараз ${days.length}.\n`);
  return days;
};
export const loadDoors = (dir?: string) => loadYaml('doors.yaml', Door, dir);
