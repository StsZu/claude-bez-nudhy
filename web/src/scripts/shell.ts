import { chaosLeft, levelFor } from '../lib/game';
import { chaosByLesson, persistent, setFocus, subscribe } from './store';

const level = document.getElementById('stat-level');
const chaos = document.getElementById('stat-chaos');
const focusBtn = document.getElementById('focus-toggle');

subscribe((s) => {
  const lv = levelFor(s.xp);
  if (level) level.textContent = `Рівень ${lv.level} · ${s.xp} XP`;
  const left = chaosLeft(s, chaosByLesson);
  if (chaos) chaos.textContent = left === 0 ? 'Непрочитаних листів: 0 — перемога' : `Непрочитаних листів: ${left}`;
  focusBtn?.setAttribute('aria-pressed', String(s.focus));
  if (focusBtn) focusBtn.textContent = s.focus ? 'Вийти з фокусу' : 'Фокус';
  document.documentElement.classList.toggle('focus', s.focus);
});

focusBtn?.addEventListener('click', () => {
  setFocus(focusBtn.getAttribute('aria-pressed') !== 'true');
});

if (!persistent()) document.getElementById('storage-note')?.removeAttribute('hidden');
