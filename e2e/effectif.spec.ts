import { expect, test, type Page } from '@playwright/test';

/**
 * MON EFFECTIF DE BOUT EN BOUT (ADR 0028) : l'entraîneur tape ses prénoms une
 * fois ; un exemple ouvert ensuite lui propose de les poser, et un toucher
 * les met sur le tableau, à la place des postes de l'exemple.
 */
const ligne = (page: Page, nom: string) =>
  page.getByRole('group', { name: nom, exact: true });

test.describe('@critical mon effectif', () => {
  test('rempli une fois, il pose ses prénoms sur un exemple', async ({
    page,
  }) => {
    await page.goto('/effectif');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mon effectif' })
    ).toBeVisible();

    await ligne(page, 'Blanc 1').getByLabel('Prénom').fill('Paul');
    await ligne(page, 'Blanc 1').getByLabel('Apnée (s)').fill('12');
    await ligne(page, 'Blanc 2').getByLabel('Prénom').fill('Zoé');
    await ligne(page, 'Blanc 2')
      .getByRole('switch', { name: 'Gaucher' })
      .check();
    await expect(
      page.getByText('2 joueurs nommés dans cette équipe.')
    ).toBeVisible();

    // Gardé sur l'appareil, sans bouton « Enregistrer ».
    await page.reload();
    await expect(ligne(page, 'Blanc 1').getByLabel('Prénom')).toHaveValue(
      'Paul'
    );

    await page.goto('/schemas');
    await page.getByRole('button', { name: 'Exemples' }).click();
    await page
      .getByRole('dialog', { name: 'Ouvrir un exemple' })
      .getByRole('list', { name: 'Phases de jeu' })
      .getByRole('button', { name: /^Engagement en 3-2-1/ })
      .click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Engagement en 3-2-1'
    );

    // L'exemple nomme ses Blancs par leur poste…
    const blanc1 = page.locator('[data-token="blanc-1"]');
    await expect(blanc1).toHaveAccessibleName(/^Blanc 1, AG,/);

    // … et propose l'effectif, sans rien imposer : un bouton.
    const carte = page.getByRole('region', { name: 'Votre effectif' });
    await expect(carte).toBeVisible();
    await carte.getByRole('button', { name: 'Appliquer mon effectif' }).click();
    await expect(carte).toBeHidden();
    await expect(
      page.getByText('Effectif appliqué : 2 joueurs.')
    ).toBeVisible();

    await expect(blanc1).toHaveAccessibleName(/^Blanc 1, Paul,/);
    await expect(blanc1).toContainText('Paul');
    await expect(page.locator('[data-token="blanc-2"]')).toHaveAccessibleName(
      /^Blanc 2, Zoé,.*gaucher/
    );
    // Le 3 n'est pas dans l'effectif : il garde son poste.
    await expect(page.locator('[data-token="blanc-3"]')).toHaveAccessibleName(
      /^Blanc 3, AD,/
    );
  });
});
