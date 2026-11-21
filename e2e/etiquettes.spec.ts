import { expect, test, type Page } from '@playwright/test';

/**
 * LES ÉTIQUETTES DE BOUT EN BOUT (ADR 0029) : l'entraîneur étiquette deux
 * schémas depuis le menu de leur vignette, filtre la bibliothèque, et envoie
 * ce que le filtre montre en carnet. Ouvert dans un AUTRE navigateur, réglé
 * en espagnol, le carnet y range les deux schémas étiquetés : la proposée
 * se lit « Ataque », la libre telle qu'elle a été écrite.
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

const etiqueter = async (page: Page, nom: string, proposee: string) => {
  await page.getByRole('button', { name: `Actions pour « ${nom} »` }).click();
  await page.getByRole('button', { name: 'Étiquettes', exact: true }).click();
  const feuille = page.getByRole('dialog', {
    name: `Étiquettes de « ${nom} »`,
  });
  const puce = feuille.getByRole('checkbox', { name: proposee });
  await puce.check();
  await expect(puce).toBeChecked();
  return feuille;
};

const carte = (page: Page, nom: string) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: nom, exact: true }),
  });

test.describe('@critical les étiquettes', () => {
  test('deux schémas étiquetés, filtrés, partent en carnet et gardent leurs étiquettes', async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto('/');
    await enregistrer(page, 'Sortie de mur');
    await nouveau(page, 'Relais au fond');
    await nouveau(page, 'Pressing haut');
    await page.goto('/schemas');

    // Une proposée et une libre sur le premier ; au doigt, 44 px de puce.
    const feuille = await etiqueter(page, 'Sortie de mur', 'Attaque');
    const boite = await feuille
      .getByRole('checkbox', { name: 'Attaque' })
      .locator('xpath=..')
      .boundingBox();
    expect(boite!.height).toBeGreaterThanOrEqual(44);
    await feuille.getByLabel('Nouvelle étiquette').fill('Cadets');
    await feuille.getByLabel('Nouvelle étiquette').press('Enter');
    await expect(
      feuille.getByRole('checkbox', { name: 'Cadets' })
    ).toBeChecked();
    await feuille.getByRole('button', { name: 'Terminer' }).click();

    // Deux proposées sur le second.
    const second = await etiqueter(page, 'Relais au fond', 'Attaque');
    await second.getByRole('checkbox', { name: 'Exercice' }).check();
    await second.getByRole('button', { name: 'Terminer' }).click();

    await expect(
      carte(page, 'Sortie de mur').getByRole('list', { name: 'Étiquettes' })
    ).toHaveText(/Attaque\s*Cadets/);

    // Le filtre : « Attaque » ne montre que les deux.
    const attaque = page.getByRole('radio', { name: 'Attaque' });
    const puce = await attaque.locator('xpath=..').boundingBox();
    expect(puce!.height).toBeGreaterThanOrEqual(44);
    await attaque.check();
    await expect(page.getByText('2 sur 3 schémas')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pressing haut' })
    ).toHaveCount(0);

    // Le carnet part de ce que le filtre montre.
    await page
      .getByRole('button', { name: 'Sélectionner', exact: true })
      .click();
    await page.getByRole('checkbox', { name: 'Tout sélectionner' }).check();
    await expect(page.getByText('2 schémas sélectionnés')).toBeVisible();
    await page.getByRole('button', { name: 'Partager la sélection' }).click();
    const partage = page.getByRole('dialog', { name: 'Partager le carnet' });
    await expect(
      partage.getByRole('button', { name: /Envoyer le lien/ })
    ).not.toHaveAttribute('aria-busy', 'true');
    const champ = partage.getByLabel('Lien du carnet');
    await expect(champ).toHaveValue(/#zc=/);
    const lien = await champ.inputValue();

    // UN AUTRE NAVIGATEUR, EN ESPAGNOL : rien de l'entraîneur, sinon le lien.
    const ailleurs = await browser.newContext({
      baseURL,
      locale: 'es-ES',
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
              { name: 'dwc_locale', value: 'es' },
            ],
          },
        ],
      },
    });
    const joueur = await ailleurs.newPage();
    await joueur.goto(lien);
    await expect(joueur).toHaveURL(/\/schemas$/);

    await expect(
      carte(joueur, 'Sortie de mur').getByRole('list', { name: 'Etiquetas' })
    ).toHaveText(/Ataque\s*Cadets/);
    await expect(
      carte(joueur, 'Relais au fond').getByRole('list', { name: 'Etiquetas' })
    ).toHaveText(/Ataque\s*Ejercicio/);
    await expect(
      joueur.getByRole('heading', { name: 'Pressing haut' })
    ).toHaveCount(0);

    // Le filtre y est aussi, dans sa langue.
    await joueur.getByRole('radio', { name: 'Ejercicio' }).check();
    await expect(
      joueur.getByRole('heading', { name: 'Sortie de mur' })
    ).toHaveCount(0);
    await expect(
      joueur.getByRole('heading', { name: 'Relais au fond' })
    ).toBeVisible();
    await ailleurs.close();
  });
});
