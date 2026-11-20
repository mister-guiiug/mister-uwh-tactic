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

    // Le chronomètre de la phase part avec elle, et se met en pause.
    const chrono = presentation.getByRole('timer');
    await expect(chrono).toHaveText(/^[45]:\d{2}$/);
    await presentation
      .getByRole('button', { name: 'Mettre le chronomètre en pause' })
      .click();
    const fige = await chrono.textContent();
    await page.waitForTimeout(1_500);
    await expect(chrono).toHaveText(fige!);
    await presentation
      .getByRole('button', { name: 'Relancer le chronomètre' })
      .click();

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

  /**
   * LE LIEN D'UNE SÉANCE EMPORTE SES SCHÉMAS (ADR 0018, suivi du 20/11/2026) :
   * ouvert dans un AUTRE navigateur — une bibliothèque vide —, il ouvre
   * l'éditeur de la séance, phases et consignes comprises, et ses schémas
   * entrent dans la bibliothèque.
   */
  test('une séance partagée par un lien s’ouvre ailleurs, avec ses schémas', async ({
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
    await page.getByLabel('Nom de la séance').fill('Jeudi');
    const choix = page.getByLabel('Schéma à ajouter');
    const ajouter = page.getByRole('button', { name: 'Ajouter à la séance' });
    await choix.selectOption({ label: 'Sortie de mur' });
    await ajouter.click();
    await choix.selectOption({ label: 'Relais au fond' });
    await ajouter.click();
    await page.getByLabel('Consigne de la phase 2').fill('Relais au fond');

    await page.getByRole('button', { name: 'Partager', exact: true }).click();
    const feuille = page.getByRole('dialog', { name: 'Partager la séance' });
    await expect(
      feuille.getByText(/emporte la séance et ses 2 schémas/)
    ).toBeVisible();
    const champ = feuille.getByLabel('Lien de la séance');
    await expect(champ).toHaveValue(/#zs=/);
    const lien = await champ.inputValue();
    // Deux schémas d'une étape tiennent largement dans un QR code.
    await expect(
      feuille.getByAltText('QR code du lien vers cette séance')
    ).toBeVisible();

    // UN AUTRE NAVIGATEUR : rien de l'expéditeur, sinon le lien.
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
    const destinataire = await ailleurs.newPage();
    await destinataire.goto(lien);

    await expect(destinataire).toHaveURL(/\/seances\/[0-9a-f-]{36}$/);
    await expect(destinataire.getByLabel('Nom de la séance')).toHaveValue(
      'Jeudi'
    );
    await expect(destinataire.getByText('2 phases · 10 min')).toBeVisible();
    await expect(destinataire.getByLabel('Consigne de la phase 2')).toHaveValue(
      'Relais au fond'
    );
    await expect(
      destinataire.getByText('Schéma introuvable dans la bibliothèque')
    ).toHaveCount(0);

    await destinataire.goto('/schemas');
    await expect(
      destinataire.getByRole('heading', { name: 'Sortie de mur' })
    ).toBeVisible();
    await expect(
      destinataire.getByRole('heading', { name: 'Relais au fond' })
    ).toBeVisible();
    await ailleurs.close();
  });
});
