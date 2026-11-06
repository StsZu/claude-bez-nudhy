// Umami: працює лише якщо в Base.astro підключено скрипт (задано PUBLIC_UMAMI_WEBSITE_ID).
// Без персональних даних: лише номери уроків, карток, питань.

export type EventName =
  | 'lesson_start'
  | 'card_view'
  | 'quiz_answer'
  | 'action_done'
  | 'lesson_complete'
  | 'challenge_day'
  | 'reminder_set';

type Umami = { track: (name: string, data?: Record<string, string | number | boolean>) => void };

export function track(name: EventName, data: Record<string, string | number | boolean> = {}): void {
  try {
    const u = (globalThis as { umami?: Umami }).umami;
    if (u && typeof u.track === 'function') u.track(name, data);
  } catch {
    /* аналітика ніколи не ламає курс */
  }
}
