import { expect, test, type Page } from '@playwright/test';

/**
 * LE CARNET IMPRIMÉ (ADR 0037) : la sélection de la bibliothèque en livret,
 * une phase par page, la vue d'ensemble en tête d'une phase à plusieurs
 * étapes.
 */
const enregistrer = async (page: Page, nom: string) => {
  await page.getByLabel('Nom du schéma').fill(nom);
  await page
    .getByRole('button', { name: /^Enregistrer/ })
    .first()
    .click();
  await expect(page.getByText(/Enregistré/).first()).toBeVisible();
};

test.describe('@critical le carnet imprimé', () => {
  test('deux schémas cochés s’impriment, une phase par page', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await enregistrer(page, 'Sortie de mur');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await enregistrer(page, 'Relais au fond');

    await page.goto('/schemas');
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page
      .getByRole('button', { name: 'Sélectionner', exact: true })
      .click();
    await page
      .getByRole('checkbox', { name: 'Sélectionner « Sortie de mur »' })
      .check();
    await page
      .getByRole('checkbox', { name: 'Sélectionner « Relais au fond »' })
      .check();
    await page.getByRole('button', { name: 'Imprimer', exact: true }).click();

    const livret = page.locator('.uwh-print--seance');
    await expect(livret.locator('.uwh-print__phase')).toHaveCount(2);
    await expect(livret).toContainText('Sortie de mur');
    await expect(livret).toContainText('Relais au fond');
    // La phase de deux étapes a sa vue d'ensemble ; l'autre, non.
    await expect(livret.locator('.uwh-print__overview')).toHaveCount(1);
  });
});
