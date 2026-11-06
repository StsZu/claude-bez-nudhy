import type { APIRoute } from 'astro';
import { loadChallenge, loadLessons } from '../lib/content';
import { u } from '../lib/url';

// Контракт v1 для Telegram-бота (plan.md → «Контракт course.json»).
export const GET: APIRoute = ({ site }) => {
  const body = {
    version: 1,
    site: (site?.origin ?? '').replace(/\/$/, ''),
    lessons: loadLessons().map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      mission: l.mission,
      tldr: l.tldr,
      minutes: l.minutes,
      url: u(`lesson/${l.id}/`),
      quiz: l.quiz.map(({ q, options, answer, why }) => ({ q, options, answer, why })),
      action: l.action,
    })),
    challenge: loadChallenge(),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
