import { expect, test } from '@playwright/test';

/**
 * L'ÉTAPE RACONTÉE (ADR 0030) : une consigne vide se remplit d'un geste, à
 * partir de ce que montre le tableau — et le tableau se lit d'une phrase.
 */
test.describe('@critical l’étape racontée', () => {
  test('« Écrire à partir du tableau » remplit la consigne, et le tableau la dit', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    // Blanc 1 avance de quelques mètres.
    const token = page.getByRole('button', { name: /^Blanc 1,/ }).first();
    await token.scrollIntoViewIfNeeded();
    const box = (await token.boundingBox())!;
    const board = page.getByRole('group', { name: /Terrain de hockey/ });
    const frame = (await board.boundingBox())!;
    const portrait = frame.height > frame.width;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + (portrait ? 0 : 90),
      box.y + box.height / 2 + (portrait ? 90 : 0),
      { steps: 6 }
    );
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Étape' }).click();
    await page
      .getByRole('button', { name: 'Écrire à partir du tableau' })
      .click();
    const consigne = page.getByLabel('Consigne de l’étape 2');
    await expect(consigne).toHaveValue(
      /^Blanc 1 (avance|se décale) de \d+ m\.$/
    );
    // Le bouton s'efface : la consigne n'est plus vide.
    await expect(
      page.getByRole('button', { name: 'Écrire à partir du tableau' })
    ).toHaveCount(0);

    // Le tableau se décrit aussi pour un lecteur d'écran.
    const describedBy = await board.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(
      /Blanc 1 (avance|se décale) de \d+ m\./
    );
  });
});
