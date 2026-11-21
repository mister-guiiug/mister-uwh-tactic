import { expect, test } from '@playwright/test';

/**
 * UN NAVIGATEUR EN ESPAGNOL (ADR 0024) : l'application s'ouvre en espagnol
 * sans qu'on le lui demande, charge son morceau AVANT le premier rendu, et
 * garde la langue choisie au rechargement.
 *
 * La configuration fixe `fr-FR` pour toute la suite ; ce fichier la
 * remplace, c'est tout son objet.
 */
test.use({ locale: 'es-ES' });

test.describe('@critical la langue des clubs', () => {
  test('un navigateur en espagnol ouvre l’application en espagnol', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pizarra');
    await expect(
      page.getByRole('button', { name: /^Blanco 1,/ })
    ).toBeVisible();

    // Les libellés des composants du socle aussi, chargés avec la langue
    // (react/i18n-lite et labels-es) : la feuille du menu se ferme en espagnol.
    await page.getByRole('button', { name: 'Más acciones' }).click();
    await expect(
      page.locator('[data-dwc="sheet"]').getByRole('button', { name: 'Cerrar' })
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // Le lexique parle la même langue que les consignes.
    await page.goto('/lexique');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Los gestos' })
    ).toBeVisible();
    await expect(page.getByText('Flick recto', { exact: true })).toBeVisible();
  });

  test('passer au néerlandais dans les Réglages, et le garder', async ({
    page,
  }) => {
    await page.goto('/reglages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajustes');
    const idioma = page.getByRole('combobox', { name: 'Idioma' });
    await expect(idioma).toHaveValue('es');

    await idioma.selectOption({ label: 'Nederlands' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Instellingen'
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    // Au rechargement, le choix rangé l'emporte sur le navigateur, et le
    // néerlandais est là dès le premier rendu.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Instellingen'
    );
    await expect(page.getByRole('combobox', { name: 'Taal' })).toHaveValue(
      'nl'
    );
  });
});
