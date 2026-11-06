// Перевірка контенту: слова на урок (SC-01), заборонені слова (SC-05), сумнівні факти (SC-09).
// Запуск: npm run check:content (з теки web/).
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(process.cwd(), '..');
const LESSONS = path.join(ROOT, 'content', 'lessons');
const MAX_WORDS = 450;
const FORBIDDEN = [/втратив/i, /згорить/i, /останній шанс/i, /поспіши/i];
// Факти, які мають бути в курсі лише з уточненням (аудит F1, F6–F9) або не бути зовсім (F12).
const FACT_RULES = [
  { re: /від 5 людей/i, msg: 'Team — від 2 людей (аудит F1)' },
  { re: /CarPlay/i, msg: 'CarPlay не підтверджено — див. NEEDS_REVIEW.md (F12)' },
  { re: /\$100[–-]200/, msg: 'Max — «від $100» (аудит F4)' },
];

const words = (s) => (s.replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
const errors = [];
const report = [];

for (const f of fs.readdirSync(LESSONS).filter((x) => x.endsWith('.md')).sort()) {
  const raw = fs.readFileSync(path.join(LESSONS, f), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    errors.push(`${f}: немає шапки ---`);
    continue;
  }
  const meta = YAML.parse(m[1]);
  const body = m[2].replace(/<details>[\s\S]*?<\/details>/g, ''); // згорнуте «для розробників» не входить у 5 хв
  const quiz = (meta.quiz ?? []).map((q) => [q.q, ...q.options, q.why].join(' ')).join(' ');
  const n = words([meta.hook, meta.tldr, body, meta.action?.text ?? '', quiz, meta.demo?.caption ?? ''].join(' '));
  report.push(`${f}: ${n} слів`);
  if (n > MAX_WORDS) errors.push(`${f}: ${n} слів > ${MAX_WORDS} (урок довший за 5 хв)`);
  for (const re of FORBIDDEN) if (re.test(raw)) errors.push(`${f}: заборонене слово ${re}`);
  // Позначки beta там, де продукт описано (аудит F5, F6, F8, F9).
  const BETA = { '02-chat.md': [/Linux — beta/], '04-u-prohramakh.md': [/Outlook \(beta\)/, /Google Docs, Sheets і Slides \(beta\)/, /Team і Enterprise/], '07-modeli-i-taryfy.md': [/Claude Security\*\*[^\n]*\(beta\)/, /обмежений доступ/] };
  for (const re of BETA[f] ?? []) if (!re.test(raw)) errors.push(`${f}: бракує уточнення ${re} (аудит)`);
  for (const r of FACT_RULES) {
    if (r.re.test(raw)) errors.push(`${f}: ${r.msg}`);
  }
}

for (const f of ['challenge.yaml', 'doors.yaml']) {
  const raw = fs.readFileSync(path.join(ROOT, 'content', f), 'utf8');
  for (const re of FORBIDDEN) if (re.test(raw)) errors.push(`${f}: заборонене слово ${re}`);
}

// Тексти інтерфейсу теж без заборонених слів.
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(process.cwd(), 'src')).filter((x) => /\.(astro|ts)$/.test(x))) {
  const raw = fs.readFileSync(f, 'utf8');
  for (const re of FORBIDDEN) if (re.test(raw)) errors.push(`${path.relative(ROOT, f)}: заборонене слово ${re}`);
}

console.log(report.join('\n'));
if (errors.length) {
  console.error(`\nПомилки (${errors.length}):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('\nКонтент OK: ≤ 450 слів на урок, 0 заборонених слів, факти аудиту виправлені.');
