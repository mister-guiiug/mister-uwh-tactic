import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/**
 * « QUOI DE NEUF » DE BOUT EN BOUT (ADR 0039) : l'entraîneur qui revient
 * trouve une carte au-dessus du terrain, chaque ligne le mène là où l'on se
 * sert de la nouveauté, la croix la range jusqu'au lot suivant ; celui qui
 * ouvre l'application pour la première fois ne la voit jamais.
 */
const ORIGIN = 'http://localhost:4173';

/** Le mode complet, comme toute la suite, et ce qu'on y ajoute. */
const appareil = (...items: { name: string; value: string }[]) => ({
  cookies: [],
  origins: [
    {
      origin: ORIGIN,
      localStorage: [
        { name: 'mister-uwh-tactic:mode', value: JSON.stringify('advanced') },
        ...items,
      ],
    },
  ],
});

/** Une trace d'usage d'avant le lot : les premiers pas fermés. */
const HABITUE = { name: 'mister-uwh-tactic:premiers-pas', value: 'true' };

const carte = (page: Page) =>
  page.getByRole('region', { name: 'Quoi de neuf', exact: true });

async function accueil(page: Page) {
  await page.goto('/');
  // Ce que SEUL React rend : le tableau, pas le contenu servi aux robots.
  await expect(
    page.getByRole('group', { name: /Terrain de hockey subaquatique/ })
  ).toBeVisible();
}

/**
 * SUR UN ÉCRAN ÉTROIT OU BAS, LA CARTE TIENT EN UNE LIGNE, et son titre la
 * déplie. Les fenêtres de Pixel 5 (393 × 727), d'iPhone 12 (390 × 664) et
 * du bureau par défaut (1 280 × 720) le sont toutes.
 */
async function deplier(page: Page) {
  const titre = carte(page).getByRole('button', {
    name: 'Quoi de neuf',
    exact: true,
  });
  if ((await titre.count()) > 0) {
    await expect(titre).toHaveAttribute('aria-expanded', 'false');
    await titre.click();
    await expect(titre).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(carte(page).getByRole('link').first()).toBeVisible();
}

test.describe('@critical quoi de neuf', () => {
  test.describe('le nouveau venu', () => {
    test('ne la voit pas, ni au premier lancement ni après', async ({
      page,
    }) => {
      await accueil(page);
      await expect(carte(page)).toHaveCount(0);
      // Une phase écrite et enregistrée depuis : ce sont des traces d'usage,
      // mais d'après le lot. Il n'avait rien à retrouver, et n'a toujours
      // rien à retrouver.
      await page
        .getByRole('button', { name: 'Ajouter une étape' })
        .first()
        .click();
      await page.getByLabel('Nom du schéma').fill('Sortie de mur');
      await page
        .getByRole('button', { name: /^Enregistrer/ })
        .first()
        .click();
      await expect(page.getByText(/Enregistré/).first()).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('group', { name: /Terrain de hockey subaquatique/ })
      ).toBeVisible();
      await expect(carte(page)).toHaveCount(0);
    });
  });

  test.describe('l’entraîneur qui revient', () => {
    test.use({ storageState: appareil(HABITUE) });

    test('chaque ligne mène là où l’on s’en sert', async ({ page }) => {
      await accueil(page);
      const news = carte(page);
      await expect(news).toBeVisible();
      await expect(
        news.getByRole('heading', { name: 'Quoi de neuf' })
      ).toBeVisible();
      await deplier(page);
      await expect(news.getByRole('link')).toHaveCount(5);

      // Sur le tableau, la fonction s'ouvre : le menu « ⋯ »…
      await news
        .getByRole('link', { name: /^Le lien pour les joueurs/ })
        .click();
      const menu = page.getByRole('dialog', { name: 'Actions du schéma' });
      await expect(
        menu.getByRole('button', { name: /^Lien pour les joueurs/ })
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();

      // … et les lignes de la phase, dans la frise.
      await news.getByRole('link', { name: /^Les variantes/ }).click();
      await expect(
        page.getByRole('dialog', { name: 'Lignes de la phase' })
      ).toBeVisible();
      await page.keyboard.press('Escape');

      // Ailleurs, l'écran ; suivre un lien ne range pas la carte.
      await news.getByRole('link', { name: /^Le chrono de match/ }).click();
      await expect(page).toHaveURL(/\/match$/);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Match', exact: true })
      ).toBeVisible();
      await page.goBack();
      await expect(carte(page)).toBeVisible();
    });

    test('fermée, elle ne revient pas au rechargement', async ({ page }) => {
      await accueil(page);
      await carte(page)
        .getByRole('button', { name: 'Masquer les nouveautés' })
        .click();
      await expect(carte(page)).toHaveCount(0);
      await page.reload();
      await expect(
        page.getByRole('group', { name: /Terrain de hockey subaquatique/ })
      ).toBeVisible();
      await expect(carte(page)).toHaveCount(0);
    });
  });

  test.describe('le lot suivant', () => {
    // Un lot d'avant réglé : la carte revient, sans autre trace.
    test.use({
      storageState: appareil({
        name: 'mister-uwh-tacticnouveautes',
        value: JSON.stringify({ v: 1, data: { seen: '2026-10' } }),
      }),
    });

    test('la ramène', async ({ page }) => {
      await accueil(page);
      await expect(carte(page)).toBeVisible();
    });
  });

  for (const theme of ['light', 'dark'] as const) {
    test.describe(`@a11y thème ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
      test.use({
        storageState: appareil(HABITUE, { name: 'dwc_theme', value: theme }),
      });

      test('la carte, sans violation WCAG A/AA', async ({ page }) => {
        await accueil(page);
        await expect(carte(page)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        // Dépliée : les liens et leur teinte sont audités.
        await deplier(page);
        await expectNoA11yViolations(page, AxeBuilder, expect);
      });
    });
  }
});
