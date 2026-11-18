import { expect, test, type Page } from '@playwright/test';

/**
 * UNE SÉANCE DE BOUT EN BOUT (ADR 0018) : deux schémas de la bibliothèque
 * enchaînés, présentés au tableau, de l'un à l'autre.
 */
const enregistrer = async (page: Page, nom: string) => {
  await page.getByLabel('Nom du schéma').fill(nom);
  await page
    .getByRole('button', { name: /^Enregistrer/ })
    .first()
    .click();
  await expect(page.getByText(/Enregistré/).first()).toBeVisible();
};

test.describe('@critical les séances', () => {
  test('une séance de deux phases se prépare et se présente', async ({
    page,
  }) => {
    await page.goto('/');
    await enregistrer(page, 'Sortie de mur');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await enregistrer(page, 'Relais au fond');

    await page.goto('/seances');
    await page.getByRole('button', { name: 'Nouvelle séance' }).click();
    await page.getByLabel('Nom de la séance').fill('Mardi');
    const choix = page.getByLabel('Schéma à ajouter');
    const ajouter = page.getByRole('button', { name: 'Ajouter à la séance' });
    await choix.selectOption({ label: 'Sortie de mur' });
    await ajouter.click();
    await choix.selectOption({ label: 'Relais au fond' });
    await ajouter.click();
    await expect(page.getByText('2 phases · 10 min')).toBeVisible();

    await page.getByRole('button', { name: 'Présenter la séance' }).click();
    const presentation = page.getByRole('dialog', { name: /Présenter/ });
    await expect(presentation).toBeVisible();
    await expect(presentation.getByText('Phase 1 / 2')).toBeVisible();
    await expect(presentation.getByText('Sortie de mur')).toBeVisible();

    await presentation.getByRole('button', { name: 'Phase suivante' }).click();
    await expect(presentation.getByText('Phase 2 / 2')).toBeVisible();
    await expect(presentation.getByText('Relais au fond')).toBeVisible();
    await expect(
      presentation.getByRole('button', { name: 'Phase suivante' })
    ).toBeDisabled();

    // De retour à la liste, la séance est là, enregistrée.
    await page.goto('/seances');
    await expect(page.getByRole('link', { name: /^Mardi/ })).toBeVisible();
  });
});
