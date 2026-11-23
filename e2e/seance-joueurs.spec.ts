import { expect, test, type Page } from '@playwright/test';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeJson, toCompact } from '../src/features/board/share.ts';
import { SEANCE_PLAYER_PREFIX } from '../src/features/seances/link.ts';

/**
 * LE LIEN « POUR LES JOUEURS » D'UNE SÉANCE (ADR 0040) : ouvert dans un
 * autre navigateur, il présente la séance — on passe d'une phase à l'autre,
 * on tourne les étapes, on ne déplace personne —, et rien n'entre dans la
 * bibliothèque. En quittant la présentation, l'application est là, telle
 * qu'elle est.
 */

/** Un schéma de deux étapes : le premier joueur blanc avance. */
function phase(id: string, name: string) {
  const tactic = createTactic({ id, name });
  const next = structuredClone(tactic.steps[0]!);
  const blanc = playerId('blanc', 1);
  next.poses[blanc] = { ...next.poses[blanc]!, x: 8 };
  tactic.steps.push(next);
  return tactic;
}

/**
 * Le lien lisible d'une séance de deux phases, écrit à la main : l'enveloppe
 * de `seances/share.ts`, dont les magasins ne se chargent pas hors du
 * navigateur.
 */
function lienJoueurs() {
  const seance = {
    v: 1,
    n: 'Mardi',
    p: [
      [0, 6, 'Au mur, sans attendre'],
      [1, 4, ''],
    ],
    t: [
      toCompact(phase('e2e-sortie', 'Sortie de mur')),
      toCompact(phase('e2e-relais', 'Relais au fond')),
    ],
  };
  return `/${SEANCE_PLAYER_PREFIX}${encodeJson(seance)}`;
}

const enregistrer = async (page: Page, nom: string) => {
  await page.getByLabel('Nom du schéma').fill(nom);
  await page
    .getByRole('button', { name: /^Enregistrer/ })
    .first()
    .click();
  await expect(page.getByText(/Enregistré/).first()).toBeVisible();
};

test.describe('@critical le lien pour les joueurs d’une séance', () => {
  test('s’ouvre en présentation, phase après phase, sans rien ranger', async ({
    page,
  }) => {
    await page.goto(lienJoueurs());
    const presentation = page.getByRole('dialog', { name: 'Présenter' });
    await expect(presentation).toBeVisible();
    await expect(presentation.getByText('Phase 1 / 2')).toBeVisible();
    await expect(
      presentation.getByText('Sortie de mur', { exact: true })
    ).toBeVisible();
    await expect(page.getByText(/passez d’une phase à l’autre/)).toBeVisible();
    // Le lien a quitté l'adresse : un rechargement ne le rejouera pas.
    await expect(page).toHaveURL(/\/$/);

    // En présentation, un jeton n'est pas un bouton qu'on saisit.
    await expect(
      presentation.getByRole('button', { name: /^Blanc 1,/ })
    ).toHaveCount(0);
    // Les étapes se tournent…
    await presentation.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(
      presentation.locator('.uwh-timeline__step[aria-current="step"]')
    ).toHaveText('2');
    // … et les phases s'enchaînent.
    await presentation.getByRole('button', { name: 'Phase suivante' }).click();
    await expect(presentation.getByText('Phase 2 / 2')).toBeVisible();
    await expect(
      presentation.getByText('Relais au fond', { exact: true })
    ).toBeVisible();
    await expect(
      presentation.getByRole('button', { name: 'Phase suivante' })
    ).toBeDisabled();

    // Le lien oriente, il ne verrouille pas : en quittant, le tableau.
    await presentation
      .getByRole('button', { name: 'Quitter la présentation' })
      .click();
    await expect(presentation).toHaveCount(0);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Relais au fond'
    );

    // Rien n'est rangé : ni la séance, ni ses schémas.
    await page.goto('/seances');
    await expect(
      page.getByText('Préparez votre première séance')
    ).toBeVisible();
    await page.goto('/schemas');
    await expect(
      page.getByRole('heading', { name: 'Sortie de mur' })
    ).toHaveCount(0);
  });

  test('« Pour les joueurs » donne le lien et le QR code qui la présentent', async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto('/');
    await enregistrer(page, 'Sortie de mur');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await enregistrer(page, 'Relais au fond');

    await page.goto('/seances');
    await page.getByRole('button', { name: 'Nouvelle séance' }).click();
    await page.getByLabel('Nom de la séance').fill('Samedi');
    const choix = page.getByLabel('Schéma à ajouter');
    const ajouter = page.getByRole('button', { name: 'Ajouter à la séance' });
    await choix.selectOption({ label: 'Sortie de mur' });
    await ajouter.click();
    await choix.selectOption({ label: 'Relais au fond' });
    await ajouter.click();

    await page.getByRole('button', { name: 'Partager', exact: true }).click();
    const feuille = page.getByRole('dialog', { name: 'Partager la séance' });
    await feuille.getByRole('tab', { name: 'Pour les joueurs' }).click();
    await expect(
      feuille.getByRole('tab', { name: 'Pour les joueurs' })
    ).toHaveAttribute('aria-selected', 'true');
    const champ = feuille.getByLabel('Lien pour les joueurs');
    await expect(champ).toHaveValue(/#zsp=/);
    const lien = await champ.inputValue();
    await expect(
      feuille.getByAltText('QR code du lien vers cette séance')
    ).toBeVisible();

    // UN AUTRE NAVIGATEUR : le joueur, qui n'a que le lien — et le mode
    // complet, comme toute la suite (`playwright.config.ts`).
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
    const presentation = joueur.getByRole('dialog', { name: 'Présenter' });
    await expect(presentation).toBeVisible();
    await expect(presentation.getByText('Phase 1 / 2')).toBeVisible();
    await expect(
      presentation.getByText('Sortie de mur', { exact: true })
    ).toBeVisible();
    await presentation.getByRole('button', { name: 'Phase suivante' }).click();
    await expect(presentation.getByText('Phase 2 / 2')).toBeVisible();

    await joueur.goto('/seances');
    await expect(
      joueur.getByText('Préparez votre première séance')
    ).toBeVisible();
    await ailleurs.close();
  });
});
