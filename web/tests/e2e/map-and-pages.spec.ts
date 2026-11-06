import { expect, test } from '@playwright/test';

test('карта: роль «Розробник» рекомендує 3 і 6, урок 6 відкривається напряму', async ({ page }) => {
  await page.goto('/map/');
  await page.getByRole('button', { name: 'Розробник' }).click();
  await expect(page.locator('li[data-lesson="3"] [data-rec]')).toBeVisible();
  await expect(page.locator('li[data-lesson="6"] [data-rec]')).toBeVisible();
  await expect(page.locator('li[data-lesson="7"] [data-rec]')).toBeHidden();
  await expect(page.locator('#missions > li').nth(1)).toHaveAttribute('data-lesson', '3');
  await page.locator('li[data-lesson="6"] a').click();
  await expect(page).toHaveURL(/\/lesson\/6\/?$/);
  await expect(page.getByRole('heading', { name: 'Місія «Автопілот»' })).toBeVisible();
});

test('вибір ролі на /start веде в першу місію маршруту', async ({ page }) => {
  await page.goto('/start/');
  await page.getByRole('button', { name: /Розробник/ }).click();
  await expect(page).toHaveURL(/\/lesson\/1\/?$/);
});

test('режим фокусу ховає шапку й пам\'ятається', async ({ page }) => {
  await page.goto('/lesson/3/');
  await page.getByRole('button', { name: 'Фокус' }).click();
  await expect(page.locator('#stat-level')).toBeHidden();
  await expect(page.locator('.foot')).toBeHidden();
  await page.reload();
  await expect(page.locator('#stat-level')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Вийти з фокусу' })).toBeVisible();
  await page.getByRole('button', { name: 'Вийти з фокусу' }).click();
  await expect(page.locator('#stat-level')).toBeVisible();
});

test('шпаргалка: фільтр «таблиц» лишає рядки про таблиці', async ({ page }) => {
  await page.goto('/doors/');
  await page.getByLabel('Що хочеш зробити?').fill('таблиц');
  const visible = page.locator('.doors-list li:visible');
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText('Excel');
  await page.getByLabel('Що хочеш зробити?').fill('ракета');
  await expect(page.getByText('Не знайшлося')).toBeVisible();
});

test('челендж: день 5 без 1–4 дає +20 XP один раз', async ({ page }) => {
  await page.goto('/challenge/');
  const b = page.locator('[data-day="5"]');
  await b.click();
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'true');
  const xp = await page.evaluate(() => JSON.parse(localStorage.getItem('bez-nudhy:v1')!).xp);
  expect(xp).toBe(20);
});

test('скидання прогресу вимагає підтвердження', async ({ page }) => {
  await page.goto('/challenge/');
  await page.locator('[data-day="1"]').click();
  await page.goto('/progress/');
  await page.getByRole('button', { name: 'Скинути прогрес…' }).click();
  await page.getByRole('button', { name: 'Скасувати' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bez-nudhy:v1')!).xp)).toBe(20);
  await page.getByRole('button', { name: 'Скинути прогрес…' }).click();
  await page.getByRole('button', { name: 'Так, скинути' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bez-nudhy:v1')!).xp)).toBe(0);
});

test('пропуск 5 днів: XP на місці, «З поверненням», жодних слів про втрату', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00+02:00'));
  await page.goto('/challenge/');
  await page.locator('[data-day="1"]').click();
  await page.clock.setFixedTime(new Date('2026-11-08T10:00:00+02:00'));
  await page.reload();
  await page.locator('[data-day="2"]').click();
  await expect(page.locator('#toast')).toContainText(/З поверненням|\+20 XP/);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('bez-nudhy:v1')!));
  expect(s.xp).toBe(40);
  expect(s.badges).toContain('comeback');
  expect(s.streak.count).toBe(1);
  await page.goto('/progress/');
  expect(await page.locator('body').innerText()).not.toMatch(/втратив|згорить|останній шанс/i);
});

test('без JS усі картки уроку видно, пояснення в розгортках', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.goto('/lesson/1/');
  const cards = page.locator('section.card');
  const n = await cards.count();
  for (let i = 0; i < n; i++) await expect(cards.nth(i)).toBeVisible();
  await expect(page.locator('details.nojs').first()).toBeVisible();
  await ctx.close();
});

test('сховище недоступне: курс працює й показує примітку', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('SecurityError');
      },
    });
  });
  await page.goto('/lesson/1/');
  await expect(page.locator('#storage-note')).toBeVisible();
  await page.getByRole('button', { name: 'Далі' }).click();
  await expect(page.locator('section.card.current')).toHaveCount(1);
});

test('reduced motion: картка без анімації', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lesson/1/');
  const anim = await page.locator('section.card.current').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});

test('без налаштування аналітики немає скрипта Umami', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('script[data-website-id]')).toHaveCount(0);
});

test('нагадування: завантажується .ics з 7 подіями', async ({ page }) => {
  await page.goto('/reminders/');
  await page.getByLabel('О котрій нагадувати?').fill('08:30');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Завантажити календар (.ics)' }).click(),
  ]);
  const path = await download.path();
  const fs = await import('node:fs');
  const ics = fs.readFileSync(path!, 'utf8');
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(7);
  expect(ics).toMatch(/DTSTART:\d{8}T083000/);
  expect(ics).toContain('/lesson/2/');
});

test('бібліотека промптів: 8 груп, фільтр за місією, копіювання', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/prompts/');
  await expect(page.locator('[data-group]')).toHaveCount(8);
  await page.getByRole('button', { name: '4. Таблиця з пекла' }).click();
  await expect(page.locator('[data-group]:visible')).toHaveCount(1);
  await page.locator('[data-group="4"] button[data-copy-target]').first().click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('Поясни цю таблицю');
});
