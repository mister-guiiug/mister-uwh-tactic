import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/**
 * LES VARIANTES DE BOUT EN BOUT (ADR 0027) : « et si leur 2 monte ? ».
 * L'entraîneur fait partir une autre suite d'une étape, la nomme, la joue,
 * la présente en choisissant la branche — à la souris, puis à la
 * télécommande —, et la retrouve chez qui ouvre le lien.
 */
async function glisser(page: Page, name: RegExp, dx: number, dy: number) {
  const token = page.getByRole('button', { name }).first();
  await token.scrollIntoViewIfNeeded();
  const box = (await token.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

test.describe('@critical les variantes', () => {
  test('créer une variante, la jouer, la présenter, la retrouver par le lien', async ({
    page,
    browser,
    baseURL,
  }) => {
    // Le lien partagé est relevé à la source : la feuille de partage du
    // système est remplacée par un relevé.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          (window as unknown as { __lien?: string }).__lien = data.url;
        },
      });
    });
    await page.goto('/');
    const etapes = page.locator('.uwh-timeline .uwh-timeline__step');
    await expect(etapes).toHaveCount(1);

    // La ligne principale : deux étapes, Blanc 1 avance à la seconde.
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await expect(etapes).toHaveCount(2);
    await glisser(page, /^Blanc 1,/, 70, 0);

    // De l'étape 1, une variante, nommée aussitôt.
    await etapes.first().click();
    await page.getByRole('button', { name: 'Variantes de la phase' }).click();
    await page
      .getByRole('button', { name: 'Nouvelle variante depuis l’étape 1' })
      .click();
    const nom = page.getByLabel('Nom de la ligne');
    await expect(nom).toBeFocused();
    await nom.fill('Leur 2 monte');
    await expectNoA11yViolations(page, AxeBuilder, expect);
    await page.keyboard.press('Escape');

    // La frise dit sur quelle ligne on est, et où la phase se sépare.
    const lignes = page.getByRole('button', {
      name: 'Lignes de la phase, ligne affichée : Leur 2 monte',
    });
    await expect(lignes).toBeVisible();
    await expect(etapes).toHaveCount(2);
    await expect(etapes.first()).toHaveAttribute('data-fork', '');
    await expect(etapes.first()).toHaveAttribute('data-common', '');
    await expect(etapes.first()).toHaveAccessibleName(
      'Étape 1, commune à la ligne principale, la phase se sépare ici'
    );
    await expect(etapes.nth(1)).toHaveAttribute('aria-current', 'step');

    // Sur la variante, c'est Blanc 2 qui monte.
    await glisser(page, /^Blanc 2,/, 0, -60);

    // La jouer : la lecture enchaîne les étapes de la variante, et s'arrête.
    await etapes.first().click();
    await page
      .getByRole('button', { name: 'Lire', exact: true })
      .first()
      .click();
    await expect(etapes.nth(1)).toHaveAttribute('aria-current', 'step', {
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: 'Lire', exact: true }).first()
    ).toBeVisible();
    await expect(lignes).toBeVisible();

    // PRÉSENTER : à l'étape où la phase se sépare, un bouton par suite.
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Présenter/ }).click();
    const presentation = page.getByRole('dialog', { name: 'Présenter' });
    await expect(presentation).toBeVisible();
    await page.keyboard.press('PageUp');
    const suite = presentation.getByRole('group', {
      name: 'Suite de la phase',
    });
    const principale = suite.getByRole('button', { name: 'Ligne principale' });
    const variante = suite.getByRole('button', { name: 'Leur 2 monte' });
    await expect(variante).toHaveAttribute('aria-pressed', 'true');
    await expect(principale).toHaveAttribute('aria-pressed', 'false');
    await expectNoA11yViolations(page, AxeBuilder, expect);

    // Au toucher : la ligne principale.
    await principale.click();
    await expect(principale).toHaveAttribute('aria-pressed', 'true');
    await expect(presentation.locator('.uwh-present__line')).toHaveText(
      'Ligne principale'
    );

    // À LA TÉLÉCOMMANDE : « suivant » suit la ligne choisie, puis, à son
    // bout, revient à l'embranchement et prend la suite d'après.
    const pastilles = presentation.locator('.uwh-timeline__step');
    await page.keyboard.press('PageDown');
    await expect(pastilles.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(suite).toHaveCount(0);
    await page.keyboard.press('PageDown');
    await expect(pastilles.first()).toHaveAttribute('aria-current', 'step');
    await expect(variante).toHaveAttribute('aria-pressed', 'true');
    await expect(presentation.locator('.uwh-present__line')).toHaveText(
      'Leur 2 monte'
    );
    await page.keyboard.press('PageDown');
    await expect(pastilles.nth(1)).toHaveAttribute('aria-current', 'step');
    await presentation
      .getByRole('button', { name: 'Quitter la présentation' })
      .click();
    await expect(presentation).toHaveCount(0);

    // LE LIEN emporte les deux lignes.
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Partager le lien/ }).click();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __lien?: string }).__lien)
      )
      .toMatch(/#s=/);
    const lien = (await page.evaluate(
      () => (window as unknown as { __lien?: string }).__lien
    ))!;

    // UN AUTRE NAVIGATEUR, rien de l'entraîneur sinon le lien.
    const ailleurs = await browser.newContext({
      baseURL,
      locale: 'fr-FR',
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL!).origin,
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
    await expect(joueur.getByText(/Schéma partagé ouvert/)).toBeVisible();
    // Le schéma s'ouvre sur sa ligne principale ; la variante est là.
    await joueur
      .getByRole('button', {
        name: 'Lignes de la phase, ligne affichée : Ligne principale',
      })
      .click();
    await joueur.getByRole('button', { name: /^Leur 2 monte/ }).click();
    await expect(
      joueur.getByRole('button', {
        name: 'Lignes de la phase, ligne affichée : Leur 2 monte',
      })
    ).toBeVisible();
    const reçues = joueur.locator('.uwh-timeline .uwh-timeline__step');
    await expect(reçues).toHaveCount(2);
    await expect(reçues.first()).toHaveAttribute('data-fork', '');
    await ailleurs.close();
  });
});
