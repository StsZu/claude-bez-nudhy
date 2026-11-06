import { toast } from './store';

/** Кнопки [data-copy-target]: копіюють текст елемента; без доступу до буфера — виділяють текст. */
export function initCopyButtons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('[data-copy-target]').forEach((btn) => {
    if (btn.dataset.ready) return;
    btn.dataset.ready = '1';
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copyTarget || '');
      if (!el) return;
      const text = el.textContent?.trim() || '';
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Скопійовано';
        toast('Промпт скопійовано — встав його в Claude');
      } catch {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        toast('Текст виділено — натисни Ctrl+C або Cmd+C');
      }
      setTimeout(() => (btn.textContent = btn.dataset.label || 'Скопіювати промпт'), 2500);
    });
  });
}
