// Фільтр «Які двері відчинити»: збіг за початком слова, без урахування регістру.
export function matches(haystack: string, query: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const stems = words.map((w) => (w.length > 5 ? w.slice(0, Math.max(5, w.length - 2)) : w));
  return stems.every((s) => haystack.includes(s));
}

export function initDoorsFilters(): void {
  document.querySelectorAll<HTMLElement>('[data-doors-filter]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const input = root.querySelector<HTMLInputElement>('[data-q]')!;
    const items = [...root.querySelectorAll<HTMLLIElement>('li[data-search]')];
    const count = root.querySelector<HTMLElement>('[data-count]')!;
    const empty = root.querySelector<HTMLElement>('[data-empty]')!;
    const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-chip]')];

    const run = () => {
      let n = 0;
      for (const li of items) {
        const ok = matches(li.dataset.search || '', input.value);
        li.hidden = !ok;
        if (ok) n++;
      }
      count.textContent = input.value.trim() ? `Знайдено: ${n}` : `Усього варіантів: ${items.length}`;
      empty.hidden = n > 0;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chip === input.value.trim())));
    };
    input.addEventListener('input', run);
    chips.forEach((c) =>
      c.addEventListener('click', () => {
        input.value = input.value.trim() === c.dataset.chip ? '' : c.dataset.chip || '';
        run();
      }),
    );
  });
}
