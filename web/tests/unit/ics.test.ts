import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, fold } from '../../src/lib/ics';

const days = Array.from({ length: 7 }, (_, i) => ({
  day: i + 1,
  text: `Дія дня ${i + 1}; кома, крапка з комою`,
  url: `https://example.org/challenge/#day-${i + 1}`,
}));

describe('ics', () => {
  const ics = buildIcs({ startDate: '2026-11-07', time: '09:00', days, now: new Date('2026-11-06T10:00:00Z') });

  it('7 подій у вибраний час, послідовні дати', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(7);
    expect(ics).toContain('DTSTART:20261107T090000');
    expect(ics).toContain('DTSTART:20261113T090000');
    expect(ics).toContain('DTEND:20261107T090500');
  });

  it('CRLF, обгортка календаря, екранування', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
  });

  it('fold не розриває кирилицю', () => {
    const line = 'SUMMARY:' + 'ї'.repeat(100);
    const unfolded = fold(line).replace(/\r\n /g, '');
    expect(unfolded).toBe(line);
  });

  it('подія біля півночі переходить на наступну дату', () => {
    const late = buildIcs({ startDate: '2026-11-07', time: '23:58', days: days.slice(0, 1) });
    expect(late).toContain('DTEND:20261108T000300');
  });

  it('некоректний час → помилка', () => {
    expect(() => buildIcs({ startDate: '2026-11-07', time: '25:00', days })).toThrow();
  });
});
