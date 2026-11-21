import { expect, test, type Page } from '@playwright/test';

/**
 * LE FEUTRE DE LA PRÉSENTATION (ADR 0031) : on entoure, on trace, au doigt ou
 * à la souris ; le trait ne change pas d'étape, et s'efface à la suivante.
 */
async function tracer(page: Page) {
  const views = page.locator('.uwh-present .uwh-stage__views');
  const box = (await views.boundingBox())!;
  const x = box.x + box.width * 0.4;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 10, { steps: 5 });
  await page.mouse.move(x + 120, y + 60, { steps: 5 });
  await page.mouse.up();
}

test.describe('@critical le feutre de la présentation', () => {
  test('on trace par-dessus le tableau ; l’étape suivante l’efface', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page
      .getByRole('button', { name: /^Présenter/ })
      .first()
      .click();
    const presentation = page.getByRole('dialog', { name: /Présenter/ });
    await expect(presentation).toBeVisible();
    await presentation.getByRole('button', { name: 'Étape 1' }).click();

    const feutre = presentation.getByRole('button', {
      name: 'Feutre',
      exact: true,
    });
    await feutre.click();
    await expect(feutre).toHaveAttribute('aria-pressed', 'true');
    await tracer(page);
    await expect(page.locator('.uwh-marker path')).toHaveCount(1);
    // Le trait n'a pas tourné la page.
    await expect(
      presentation.locator('.uwh-timeline__step[aria-current="step"]')
    ).toHaveText('1');

    await tracer(page);
    await expect(page.locator('.uwh-marker path')).toHaveCount(2);
    await presentation
      .getByRole('button', { name: 'Effacer le feutre' })
      .click();
    await expect(page.locator('.uwh-marker path')).toHaveCount(0);

    await tracer(page);
    await presentation.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(page.locator('.uwh-marker path')).toHaveCount(0);

    await feutre.click();
    await expect(page.locator('.uwh-marker')).toHaveCount(0);
  });
});
