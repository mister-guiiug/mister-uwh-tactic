import { expect, test, type Page } from '@playwright/test';

/**
 * L'ENREGISTREMENT EN DIRECT (ADR 0025) : on raconte l'action en faisant
 * glisser les joueurs, le tableau découpe les étapes à chaque pause.
 */
async function glisser(page: Page, name: RegExp, dx: number, dy: number) {
  const token = page.getByRole('button', { name }).first();
  await token.scrollIntoViewIfNeeded();
  const box = (await token.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

test.describe('@critical l’enregistrement en direct', () => {
  test('chaque pause du doigt ouvre une étape, des glissers rapprochés n’en font qu’une', async ({
    page,
  }) => {
    await page.goto('/');
    const etapes = page.locator('.uwh-timeline__step');
    await expect(etapes).toHaveCount(1);

    const bouton = page.getByRole('button', {
      name: 'Enregistrement en direct',
    });
    await bouton.click();
    await expect(bouton).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: /En direct/ })
    ).toBeVisible();

    // Deux joueurs à la suite, sans pause : une seule étape nouvelle.
    await glisser(page, /^Blanc 1,/, 60, 20);
    await glisser(page, /^Blanc 2,/, 50, -20);
    await expect(etapes).toHaveCount(2);

    // Une pause, puis un glisser : l'étape d'après.
    await page.waitForTimeout(1_500);
    await glisser(page, /^Blanc 1,/, 40, 0);
    await expect(etapes).toHaveCount(3);
    await expect(
      page.locator('.uwh-timeline__step[aria-current="step"]')
    ).toHaveText('3');

    // Lire arrête l'enregistrement.
    await page.getByRole('button', { name: /^Lire/ }).first().click();
    await expect(bouton).toHaveAttribute('aria-pressed', 'false');
  });
});
