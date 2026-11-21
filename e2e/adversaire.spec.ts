import { expect, test, type Page } from '@playwright/test';

/**
 * L'ADVERSAIRE QUI RÉAGIT (ADR 0032), de bout en bout : placer les Blancs,
 * faire réagir les Noirs, annuler.
 *
 * Les positions se lisent dans l'attribut `transform` du jeton, en mètres du
 * terrain, comme dans `tableau.spec.ts` : c'est ce que l'écran dessine, et
 * le terrain dressé d'un téléphone tourne le groupe parent, pas le jeton.
 */
const positionOf = async (page: Page, name: string) => {
  const transform = await page
    .getByRole('button', { name, exact: false })
    .first()
    .locator('> g')
    .first()
    .getAttribute('transform');
  const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform ?? '');
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
};

const team = (page: Page, prefix: 'Blanc' | 'Noir') =>
  Promise.all([1, 2, 3, 4, 5, 6].map(n => positionOf(page, `${prefix} ${n},`)));

/** L'abscisse des six Noirs, arrondie au centimètre et rangée. */
const noirsX = async (page: Page) =>
  (await team(page, 'Noir'))
    .map(p => Math.round(p.x * 100) / 100)
    .sort((a, b) => a - b);

test.describe('@critical l’adversaire qui réagit', () => {
  test('les Blancs en 3-2-1, les Noirs réagissent, Annuler les remet', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Équipes' }).click();
    await page.getByRole('button', { name: 'Placer l’équipe' }).click();
    await expect(page.getByText('Blancs en 3-2-1.')).toBeVisible();
    const blancs = await team(page, 'Blanc');

    // La phrase qui dit ce que c'est, là où est le bouton.
    await expect(
      page.getByText(/^Une aide au placement, pas une intelligence de jeu/)
    ).toBeVisible();
    // À l'engagement, les six Noirs sont contre leur mur (25 − 0,6 m).
    expect(await noirsX(page)).toEqual([24.4, 24.4, 24.4, 24.4, 24.4, 24.4]);

    await page
      .getByRole('button', { name: 'Placer les Noirs en défense' })
      .click();
    await expect(page.getByText('Noirs placés en défense.')).toBeVisible();
    // Les Blancs sont restés chez eux : cinq Noirs les attendent sur la
    // ligne médiane, le sixième garde l'axe à 3 m de son but.
    await expect
      .poll(() => noirsX(page))
      .toEqual([12.5, 12.5, 12.5, 12.5, 12.5, 22]);
    expect(await team(page, 'Blanc')).toEqual(blancs);

    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect
      .poll(() => noirsX(page))
      .toEqual([24.4, 24.4, 24.4, 24.4, 24.4, 24.4]);
  });
});

/** En mode simple, sans onglets, le geste est sous « ⋯ » (ADR 0020). */
test.describe('l’adversaire qui réagit, en mode simple', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            {
              name: 'mister-uwh-tactic:mode',
              value: JSON.stringify('simple'),
            },
          ],
        },
      ],
    },
  });

  test('« ⋯ » place les Noirs en défense', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page
      .getByRole('button', { name: 'Placer les Noirs en défense' })
      .click();
    await expect(page.getByText('Noirs placés en défense.')).toBeVisible();
    await expect
      .poll(() => noirsX(page))
      .toEqual([12.5, 12.5, 12.5, 12.5, 12.5, 22]);
  });
});
