/** Посилання з урахуванням BASE_PATH (наприклад, для GitHub Pages). */
export function u(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
