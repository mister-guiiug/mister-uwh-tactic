import { expect, test, type Page } from '@playwright/test';

/**
 * LE CARNET DE JEU DE BOUT EN BOUT (ADR 0023) : l'entraîneur coche deux
 * schémas de sa bibliothèque et en tire un lien ; ouvert dans un AUTRE
 * navigateur — une bibliothèque vide, comme le téléphone d'un joueur —, le
 * lien y range les deux, et rien d'autre.
 */
const enregistrer = async (page: Page, nom: string) => {
  await page.getByLabel('Nom du schéma').fill(nom);
  await page
    .getByRole('button', { name: /^Enregistrer/ })
    .first()
    .click();
  await expect(page.getByText(/Enregistré/).first()).toBeVisible();
};

const nouveau = async (page: Page, nom: string) => {
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
  await enregistrer(page, nom);
};

test.describe('@critical le carnet de jeu', () => {
  test('deux schémas cochés partent d’un lien, et s’ouvrent ailleurs', async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto('/');
    await enregistrer(page, 'Sortie de mur');
    await nouveau(page, 'Relais au fond');
    await nouveau(page, 'Pressing haut');

    await page.goto('/schemas');
    await page
      .getByRole('button', { name: 'Sélectionner', exact: true })
      .click();
    const sortie = page.getByRole('checkbox', {
      name: 'Sélectionner « Sortie de mur »',
    });
    await sortie.check();
    await page
      .getByRole('checkbox', { name: 'Sélectionner « Relais au fond »' })
      .check();
    await expect(page.getByText('2 schémas sélectionnés')).toBeVisible();

    // Au doigt, la case fait 44 px de côté — et toute la vignette coche.
    const caseBox = await sortie.locator('xpath=..').boundingBox();
    expect(caseBox!.width).toBeGreaterThanOrEqual(44);
    expect(caseBox!.height).toBeGreaterThanOrEqual(44);
    const tout = page.getByRole('checkbox', { name: 'Tout sélectionner' });
    const toutBox = await tout.locator('xpath=..').boundingBox();
    expect(toutBox!.height).toBeGreaterThanOrEqual(44);

    await page.getByRole('button', { name: 'Partager la sélection' }).click();
    const feuille = page.getByRole('dialog', { name: 'Partager le carnet' });
    await expect(
      feuille.getByText(/Les 2 schémas voyagent dans le lien/)
    ).toBeVisible();
    await feuille.getByLabel('Nom du carnet (facultatif)').fill('Semaine 47');
    await expect(
      feuille.getByRole('button', { name: /Envoyer le lien/ })
    ).not.toHaveAttribute('aria-busy', 'true');
    const champ = feuille.getByLabel('Lien du carnet');
    await expect(champ).toHaveValue(/#zc=/);
    const lien = await champ.inputValue();
    // Deux schémas d'une étape tiennent largement dans un QR code.
    await expect(
      feuille.getByAltText('QR code du lien vers ce carnet')
    ).toBeVisible();

    // UN AUTRE NAVIGATEUR : rien de l'entraîneur, sinon le lien.
    const ailleurs = await browser.newContext({
      baseURL,
      locale: 'fr-FR',
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(lien).origin,
            localStorage: [
              {
                name: 'mister-uwh-tactic:mode',
                value: JSON.stringify('advanced'),
              },
            ],
          },
        ],
      },
    });
    const joueur = await ailleurs.newPage();
    await joueur.goto(lien);

    await expect(joueur).toHaveURL(/\/schemas$/);
    await expect(
      joueur.getByText(/^« Semaine 47 » : 2 schémas reçus/)
    ).toBeVisible();
    await expect(
      joueur.getByRole('heading', { name: 'Sortie de mur' })
    ).toBeVisible();
    await expect(
      joueur.getByRole('heading', { name: 'Relais au fond' })
    ).toBeVisible();
    await expect(
      joueur.getByRole('heading', { name: 'Pressing haut' })
    ).toHaveCount(0);
    await expect(joueur.getByText('2 schémas', { exact: true })).toBeVisible();

    // Rangés sur l'appareil : un rechargement les garde, sans rien ajouter.
    await joueur.reload();
    await expect(
      joueur.getByRole('heading', { name: 'Sortie de mur' })
    ).toBeVisible();
    await expect(joueur.getByText('2 schémas', { exact: true })).toBeVisible();
    await ailleurs.close();
  });
});
