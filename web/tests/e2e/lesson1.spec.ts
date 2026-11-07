import { expect, test } from '@playwright/test';

const KEY = 'bez-nudhy:v1';
const FORBIDDEN = /втратив|згорить|останній шанс/i;

test('урок 1: від лендінгу до нагороди ≤ 25 натискань, прогрес переживає перезавантаження', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  let clicks = 0;
  const click = async (loc: ReturnType<typeof page.locator>) => {
    clicks++;
    await loc.click();
  };

  await page.goto('/');
  await click(page.getByRole('link', { name: 'Почати за 30 секунд' }));
  // SC-02: перша картка уроку після 1 дії
  await expect(page.getByRole('heading', { name: 'Місія «Мапа будівлі»' })).toBeVisible();

  const next = page.getByRole('button', { name: 'Далі' });
  for (let i = 0; i < 20; i++) {
    const quiz = page.locator('section.quiz.current');
    if (await quiz.count()) {
      await click(quiz.locator('.opt').first());
      // NN-04: пояснення одразу після відповіді
      await expect(quiz.locator('.feedback')).toBeVisible();
      await expect(quiz.locator('.why')).not.toBeEmpty();
    }
    const action = page.locator('section.card.current[data-kind="action"]');
    if (await action.count()) {
      await click(action.getByRole('button', { name: 'Скопіювати промпт' }));
      await click(page.getByRole('button', { name: 'Готово, зроблено' }));
      await expect(page.getByRole('button', { name: 'Зроблено — дякую!' })).toBeVisible();
    }
    if (await page.locator('section.card.current[data-kind="reward"]').count()) break;
    await click(next);
  }
  await expect(page.getByRole('heading', { name: 'Місію «Мапа будівлі» завершено' })).toBeVisible();
  await expect(page.locator('#reward-chaos')).toContainText('194');
  expect(clicks).toBeLessThanOrEqual(25);
  await expect(page.locator('#stat-level')).toContainText('XP');

  await page.reload();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(saved.done).toContain(1);
  expect(saved.actions).toContain(1);
  expect(saved.badges).toEqual(expect.arrayContaining(['first-door', 'doer']));

  await page.goto('/map/');
  await expect(page.locator('li[data-lesson="1"] [data-status]')).toHaveText('Завершено');
  await expect(page.locator('#stat-chaos')).toContainText('194');
  expect(await page.locator('body').innerText()).not.toMatch(FORBIDDEN);
});

test('повторна відповідь не дає XP повторно', async ({ page }) => {
  await page.goto('/lesson/2/');
  for (let i = 0; i < 6; i++) {
    if (await page.locator('section.quiz.current').count()) break;
    await page.getByRole('button', { name: 'Далі' }).click();
  }
  const quiz = page.locator('section.quiz.current');
  await quiz.locator('.opt[data-ok="0"]').first().click();
  await expect(quiz.locator('.verdict')).toContainText('Не зовсім');
  await quiz.locator('.opt[data-ok="1"]').click();
  await expect(quiz.locator('.verdict')).toContainText('Так!');
  const xp = await page.evaluate(() => JSON.parse(localStorage.getItem('bez-nudhy:v1')!).xp);
  expect(xp).toBe(3);
});
