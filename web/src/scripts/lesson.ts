import { BADGES, chaosLeft, levelFor, nextLesson } from '../lib/game';
import { track } from '../lib/analytics';
import { initCopyButtons } from './copy';
import { chaosByLesson, dispatch, getState, meta } from './store';

const root = document.getElementById('lesson') as HTMLElement;
const lessonId = Number(root.dataset.lesson);
const cards = [...root.querySelectorAll<HTMLElement>('section.card')];
const dots = root.querySelector('.dots')!;
const step = document.getElementById('step')!;
const prev = document.getElementById('prev') as HTMLButtonElement;
const next = document.getElementById('next') as HTMLButtonElement;
let idx = 0;
let completed = false;

cards.forEach(() => dots.appendChild(document.createElement('li')));

function show(i: number, moveFocus = true): void {
  idx = Math.max(0, Math.min(cards.length - 1, i));
  cards.forEach((c, n) => c.classList.toggle('current', n === idx));
  [...dots.children].forEach((d, n) => d.classList.toggle('seen', n <= idx));
  step.textContent = `Крок ${idx + 1} з ${cards.length}`;
  prev.disabled = idx === 0;
  next.hidden = idx === cards.length - 1;
  const card = cards[idx];
  track('card_view', { lesson: lessonId, card: idx, kind: card.dataset.kind || '' });
  if (card.dataset.kind === 'reward') complete();
  if (moveFocus) {
    card.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
}

prev.addEventListener('click', () => show(idx - 1));
next.addEventListener('click', () => show(idx + 1));

// Квіз: результат і пояснення одразу; XP — лише за першу спробу.
root.querySelectorAll<HTMLElement>('section.quiz').forEach((card) => {
  const q = Number(card.dataset.q);
  const feedback = card.querySelector<HTMLElement>('.feedback')!;
  const verdict = card.querySelector<HTMLElement>('.verdict')!;
  card.querySelectorAll<HTMLButtonElement>('.opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const correct = btn.dataset.ok === '1';
      card.querySelectorAll('.opt').forEach((b) => b.classList.remove('correct', 'wrong'));
      btn.classList.add(correct ? 'correct' : 'wrong');
      verdict.textContent = correct ? 'Так! Саме так.' : 'Не зовсім — і це нормально. Спробуй ще раз або йди далі.';
      feedback.hidden = false;
      const first = !(`${lessonId}-${q}` in getState().quiz);
      dispatch({ type: 'quiz', lesson: lessonId, q, correct });
      track('quiz_answer', { lesson: lessonId, q, correct, first });
    });
  });
});

// Дія 2 хв
initCopyButtons(root);
const didIt = document.getElementById('did-it') as HTMLButtonElement;
function renderDidIt(): void {
  const done = getState().actions.includes(lessonId);
  didIt.setAttribute('aria-pressed', String(done));
  didIt.textContent = done ? 'Зроблено — дякую!' : 'Я зробив';
}
didIt.addEventListener('click', () => {
  if (!getState().actions.includes(lessonId)) {
    dispatch({ type: 'action', lesson: lessonId });
    track('action_done', { lesson: lessonId });
  }
  renderDidIt();
});
renderDidIt();

function lessonXp(): number {
  const s = getState();
  let xp = s.done.includes(lessonId) ? 50 : 0;
  if (s.actions.includes(lessonId)) xp += 30;
  for (const q of [0, 1, 2]) {
    const v = s.quiz[`${lessonId}-${q}`];
    if (v === true) xp += 10;
    if (v === false) xp += 3;
  }
  return xp;
}

function complete(): void {
  const r = completed ? null : dispatch({ type: 'lessonDone', lesson: lessonId });
  if (r?.firstTime) track('lesson_complete', { lesson: lessonId });
  completed = true;
  const s = getState();
  const lv = levelFor(s.xp);
  document.getElementById('reward-xp')!.textContent =
    `За цю місію: ${lessonXp()} XP. Разом: ${s.xp} XP — рівень ${lv.level} «${lv.name}»` +
    (lv.next ? `, до наступного ${lv.toNext} XP.` : '.');
  const left = chaosLeft(s, chaosByLesson);
  document.getElementById('reward-chaos')!.textContent =
    left === 0 ? 'Скринька порожня: 214 листів розібрано. Ти — ШІ-провідник команди.' : `У скриньці лишилось ${left} листів із 214.`;
  const list = document.getElementById('reward-badges')!;
  list.replaceChildren(
    ...(r?.newBadges ?? []).map((b) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong></strong><span class="muted"></span>`;
      li.querySelector('strong')!.textContent = `Новий бейдж: ${BADGES[b].name}`;
      li.querySelector('span')!.textContent = BADGES[b].hint;
      return li;
    }),
  );
  const n = nextLesson(s);
  const link = document.getElementById('next-link') as HTMLAnchorElement;
  if (n && n !== lessonId) {
    link.href = meta.lessons[n].url;
    link.textContent = `Далі: місія «${meta.lessons[n].mission}»`;
  } else if (!n) {
    link.href = meta.progressUrl;
    link.textContent = 'Фінал: мій прогрес';
  }
}

if (!getState().started.includes(lessonId)) track('lesson_start', { lesson: lessonId });
dispatch({ type: 'start', lesson: lessonId });
show(0, false);
