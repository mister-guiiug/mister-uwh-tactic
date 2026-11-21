import { expect, test } from '@playwright/test';

/**
 * LES ZONES ET LES MOTS, de bout en bout (ADR 0026) : une zone se trace d'un
 * glisser, un mot se pose d'un toucher puis se saisit, et le lien partagé
 * les ramène sur un tableau vierge.
 *
 * Le lien est lu là où l'application le confie au système : `navigator.share`
 * est remplacé par une fonction qui le garde, faute de feuille de partage
 * dans un navigateur de test.
 */
declare global {
  interface Window {
    __lien?: string;
  }
}

test.describe('@critical les zones et les mots', () => {
  test('une zone tracée et un mot posé reviennent par le lien', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          window.__lien = data.url;
        },
      });
    });
    await page.goto('/');
    const board = page.getByRole('group', { name: /Terrain de hockey/ });
    await board.scrollIntoViewIfNeeded();
    const box = (await board.boundingBox())!;
    const at = (fx: number, fy: number) => ({
      x: box.x + box.width * fx,
      y: box.y + box.height * fy,
    });

    // LA ZONE : l'outil, la forme, un glisser en biais.
    await page.getByRole('tab', { name: 'Zone' }).click();
    await page.getByRole('tab', { name: 'Ellipse' }).click();
    const from = at(0.3, 0.3);
    const to = at(0.45, 0.6);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await expect(board.locator('[data-zone="ellipse"]')).toHaveCount(1);

    // LE MOT : un toucher ouvre le champ, Entrée le pose.
    await page.getByRole('tab', { name: 'Mot' }).click();
    const spot = at(0.7, 0.4);
    await page.mouse.click(spot.x, spot.y);
    const field = page.getByLabel('Mot à poser');
    await expect(field).toBeFocused();
    await field.fill('Pressing');
    await field.press('Enter');
    await expect(board.locator('[data-word]')).toHaveText('Pressing');

    // L'onglet « Étape » les liste : une étiquette pour la zone.
    await page.getByRole('tab', { name: 'Étape' }).click();
    await page.getByLabel('Étiquette de la zone 1').fill('Couloir');
    await expect(board.locator('[data-zone]')).toContainText('Couloir');
    await expect(page.getByLabel('Mot 1', { exact: true })).toHaveValue(
      'Pressing'
    );

    // LE LIEN, tel que l'application le partage.
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Partager le lien/ }).click();
    const lien = await page
      .waitForFunction(() => window.__lien)
      .then(handle => handle.jsonValue() as Promise<string>);
    expect(lien).toMatch(/#s=/);

    // Un tableau vierge : plus rien sur le terrain.
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await expect(
      page.getByText('Tableau vierge, à l’engagement.')
    ).toBeVisible();
    await expect(board.locator('[data-zone], [data-word]')).toHaveCount(0);

    // Le lien rouvert les ramène, étiquette comprise.
    await page.goto('about:blank');
    await page.goto(lien);
    await expect(
      page.getByText('Schéma partagé ouvert. Enregistrez-le pour le garder.')
    ).toBeVisible();
    await expect(board.locator('[data-zone="ellipse"]')).toHaveCount(1);
    await expect(board.locator('[data-zone]')).toContainText('Couloir');
    await expect(board.locator('[data-word]')).toHaveText('Pressing');
  });
});
