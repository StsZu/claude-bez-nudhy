// iCalendar (RFC 5545): 7 щоденних подій у плаваючому (локальному) часі учня.

export interface IcsDay {
  day: number;
  text: string;
  url: string;
}

export interface IcsOptions {
  startDate: string; // YYYY-MM-DD — дата першої події
  time: string; // HH:MM
  days: IcsDay[];
  now?: Date;
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
}

/** Розбиває рядки довші за 75 октетів UTF-8 (RFC 5545 §3.1), не розриваючи символи. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function addDays(date: string, n: number): string {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

const compact = (date: string) => date.replace(/-/g, '');

export function buildIcs({ startDate, time, days, now = new Date() }: IcsOptions): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('startDate має бути YYYY-MM-DD');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('time має бути HH:MM');
  const [hh, mm] = time.split(':');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Claude bez nudhy//UK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Claude без нудьги',
  ];
  days.forEach((d, i) => {
    const date = compact(addDays(startDate, i));
    const endMin = Number(hh) * 60 + Number(mm) + 5;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
    const endDate = endMin >= 24 * 60 ? compact(addDays(startDate, i + 1)) : date;
    lines.push(
      'BEGIN:VEVENT',
      `UID:bez-nudhy-day${d.day}-${date}@claude-bez-nudhy`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T${hh}${mm}00`,
      `DTEND:${endDate}T${end}`,
      `SUMMARY:${escapeText(`Claude без нудьги · День ${d.day} · 5 хв`)}`,
      `DESCRIPTION:${escapeText(`${d.text}\n${d.url}\nПропустив — просто продовжуй завтра.`)}`,
      `URL:${d.url}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`День ${d.day}: 5 хвилин`)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
