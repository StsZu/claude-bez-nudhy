// Lighthouse (мобільний профіль за замовчуванням) для лендінгу й уроку 1. Потрібен запущений `npm run preview`.
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const BASE = process.env.LH_URL || 'http://localhost:4321';
const PAGES = ['/', '/lesson/1/', '/map/'];
const TARGET = { accessibility: 95, performance: 90 };
const OUT = path.resolve(process.cwd(), '../specs/001-interactive-course/evidence/lighthouse.json');

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run'] });
const results = [];
let failed = false;
try {
  for (const p of PAGES) {
    const r = await lighthouse(`${BASE}${p}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
    });
    const c = r.lhr.categories;
    const row = {
      page: p,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c['best-practices'].score * 100),
      lcpMs: Math.round(r.lhr.audits['largest-contentful-paint'].numericValue),
      cls: r.lhr.audits['cumulative-layout-shift'].numericValue,
      a11yFails: Object.values(r.lhr.audits)
        .filter((a) => a.score === 0 && r.lhr.categories.accessibility.auditRefs.some((x) => x.id === a.id))
        .map((a) => a.id),
    };
    if (row.performance < TARGET.performance || row.accessibility < TARGET.accessibility) failed = true;
    results.push(row);
    console.log(JSON.stringify(row));
  }
} finally {
  await chrome.kill();
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), formFactor: 'mobile', target: TARGET, results }, null, 2));
console.log(failed ? '\nНИЖЧЕ ЦІЛІ' : '\nУ межах цілей: A11y ≥ 95, Perf ≥ 90');
process.exit(failed ? 1 : 0);
