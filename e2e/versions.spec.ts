import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/**
 * LES VERSIONS D'UN SCHÉMA DE BOUT EN BOUT (ADR 0034) : l'entraîneur
 * enregistre une phase, la retouche — une étape de plus, un autre nom —, la
 * réenregistre, puis la regrette. « ⋯ » › « Versions » sur sa vignette
 * montre la version d'avant ; « Revenir à cette version » la reprend, et le
 * tableau, où le schéma est ouvert, la montre aussitôt.
 */
const enregistrer = async (page: Page) => {
  await page
    .getByRole('button', { name: /^Enregistrer/ })
    .first()
    .click();
  await expect(page.getByText(/Enregistré/).first()).toBeVisible();
};

const etape2 = (page: Page) => page.getByRole('button', { name: /^Étape 2\b/ });

test.describe('@critical les versions d’un schéma', () => {
  test('enregistrer, retoucher, réenregistrer, puis revenir à la version d’avant', async ({
    page,
  }) => {
    await page.goto('/');
    const barre = page.locator('[data-dwc="bottom-nav"]');
    const nom = page.getByLabel('Nom du schéma');

    // La première version : une étape.
    await nom.fill('Sortie de mur');
    await enregistrer(page);
    await expect(etape2(page)).toHaveCount(0);

    // Retouchée : une étape de plus, un autre nom, réenregistrée.
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await expect(etape2(page).first()).toBeVisible();
    await nom.fill('Sortie de mur, revue');
    await enregistrer(page);

    await barre.getByRole('link', { name: 'Schémas' }).click();
    await page
      .getByRole('button', { name: 'Actions pour « Sortie de mur, revue »' })
      .click();
    await page.getByRole('button', { name: 'Versions', exact: true }).click();
    const feuille = page.getByRole('dialog', {
      name: 'Versions de « Sortie de mur, revue »',
    });
    const liste = feuille.getByRole('list', { name: 'Versions précédentes' });
    await expect(liste.getByRole('listitem')).toHaveCount(1);
    const avant = liste.getByRole('listitem').first();
    await expect(avant).toContainText('1 étape');
    await expect(avant).toContainText('Nommée « Sortie de mur »');
    // La feuille ne paraît que sur un geste : l'audit des écrans ne la voit pas.
    await expectNoA11yViolations(page, AxeBuilder, expect);

    await avant
      .getByRole('button', { name: 'Revenir à cette version' })
      .click();

    // Reprise, et rien de perdu : la retouchée est rangée à son tour. La
    // notification porte aussi « Annuler » : son texte ne finit pas au point.
    await expect(page.getByText(/^Version du .* reprise\./)).toBeVisible();
    const rouverte = page.getByRole('dialog', {
      name: 'Versions de « Sortie de mur »',
    });
    await expect(rouverte.getByRole('listitem')).toHaveCount(1);
    await expect(rouverte.getByRole('listitem').first()).toContainText(
      '2 étapes'
    );
    await expect(rouverte.getByRole('listitem').first()).toContainText(
      'Nommée « Sortie de mur, revue »'
    );
    await page.keyboard.press('Escape');
    await expect(rouverte).toHaveCount(0);

    // Le tableau montre l'ancienne : son nom, sa seule étape, enregistrée.
    await barre.getByRole('link', { name: 'Tableau' }).click();
    await expect(nom).toHaveValue('Sortie de mur');
    await expect(etape2(page)).toHaveCount(0);
    await expect(page.getByText('Enregistré').first()).toBeVisible();
  });
});
