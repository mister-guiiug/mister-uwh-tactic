// Suite a11y (axe-core + Playwright) : les quatre écrans, dans les deux thèmes.
//
// Le tag @a11y permet de filtrer en CI : `playwright test --grep @a11y`.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/*
 * CHAQUE ÉCRAN, ET PAS SEULEMENT L'ACCUEIL. Jusqu'au 06/11/2026, axe ne voyait
 * que l'accueil et À propos : Réglages (dialogue de confirmation, panneau
 * « Vos données », contrôles segmentés) et Compte (formulaire de connexion)
 * n'étaient jamais audités, alors que ce sont eux qu'une application étend.
 *
 * Chaque écran attend d'abord ce que SEUL React rend (le lien d'évitement et
 * le titre de la coquille) : le socle sert aux robots un contenu statique qui
 * a les mêmes mots, et un audit lancé dessus passerait sur une app morte.
 */
const ECRANS: {
  chemin: string;
  nom: string;
  pret: (page: Page) => Promise<void>;
}[] = [
  {
    chemin: '/',
    nom: 'accueil (tableau)',
    pret: async page => {
      await expect(
        page.getByRole('group', { name: /Terrain de hockey subaquatique/ })
      ).toBeVisible();
    },
  },
  {
    chemin: '/schemas',
    nom: 'Schémas',
    pret: async page => {
      await expect(page.getByText('Aucun schéma enregistré.')).toBeVisible();
    },
  },
  {
    chemin: '/notes',
    nom: 'Notes',
    pret: async page => {
      await expect(page.getByLabel('Nouvelle note')).toBeVisible();
    },
  },
  {
    chemin: '/reglages',
    nom: 'Réglages',
    pret: async page => {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Réglages', exact: true })
      ).toBeVisible();
    },
  },
  {
    chemin: '/compte',
    nom: 'Compte',
    pret: async page => {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Compte', exact: true })
      ).toBeVisible();
    },
  },
  {
    chemin: '/plus',
    nom: 'Plus',
    pret: async page => {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Plus', exact: true })
      ).toBeVisible();
    },
  },
  {
    chemin: '/lexique',
    nom: 'Lexique',
    pret: async page => {
      await expect(page.getByLabel('Chercher un mot')).toBeVisible();
    },
  },
  {
    chemin: '/seances',
    nom: 'Séances',
    pret: async page => {
      await expect(
        page.getByRole('button', { name: 'Nouvelle séance', exact: true })
      ).toBeVisible();
    },
  },
  {
    chemin: '/a-propos',
    nom: 'À propos',
    pret: async page => {
      await expect(page.locator('[data-dwc="family-about"]')).toBeVisible();
      await expect(page.locator('[data-dwc="app-footer"]')).toBeVisible();
    },
  },
];

/*
 * LE THÈME SOMBRE AUSSI. Playwright ouvre en clair, et la palette sombre, que
 * chaque application repeint à la main, n'était gardée nulle part. Le choix
 * est posé dans le stockage AVANT le chargement, sous la clé de
 * `ThemeProvider` ; le test vérifie ensuite que le fond est bien celui du
 * thème sombre, sinon un audit « sombre » mesurerait en silence le clair.
 */
const THEMES = [
  { nom: 'clair', valeur: 'light' },
  { nom: 'sombre', valeur: 'dark' },
] as const;

for (const theme of THEMES) {
  test.describe(`@a11y accessibilité, thème ${theme.nom}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(valeur => {
        localStorage.setItem('dwc_theme', valeur);
      }, theme.valeur);
    });

    for (const ecran of ECRANS) {
      test(`${ecran.nom} sans violation WCAG A/AA`, async ({ page }) => {
        await page.goto(ecran.chemin);
        await expect(
          page.locator('[data-dwc="app-shell-skip"]')
        ).toBeAttached();
        await ecran.pret(page);
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          theme.valeur
        );
        // L'attribut ne suffit pas : sans palette sombre derrière lui, le fond
        // resterait clair. On mesure donc la luminance du fond peint.
        const luminance = await page.evaluate(() => {
          const [r, g, b] = getComputedStyle(document.body)
            .backgroundColor.match(/\d+/g)!
            .slice(0, 3)
            .map(c => Number(c) / 255);
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        });
        if (theme.valeur === 'dark') expect(luminance).toBeLessThan(0.2);
        else expect(luminance).toBeGreaterThan(0.8);
        await expectNoA11yViolations(page, AxeBuilder, expect);
      });
    }

    /*
     * CHAQUE ONGLET DU PANNEAU, LA FRISE D'APNÉE, « CALQUES » ET LE MENU.
     * L'accueil ne montre qu'un onglet à la fois (ADR 0016) : un audit de la
     * page ouverte n'en voyait qu'un. Un jeton est sélectionné d'abord, pour
     * que l'inspecteur montre ses champs. Au téléphone, toucher un onglet
     * ouvre la feuille à mi-hauteur (ADR 0017).
     */
    test('panneau du tableau : chaque onglet, et le menu', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /^Blanc 1,/ }).focus();
      for (const onglet of ['Jeton', 'Étape', 'Équipes', 'Règles', 'Bassin']) {
        await page.getByRole('tab', { name: onglet, exact: true }).click();
        await expect(page.getByRole('tabpanel')).toBeVisible();
        await expectNoA11yViolations(page, AxeBuilder, expect);
      }
      await page.getByRole('button', { name: /^Apnée/ }).click();
      await expect(page.getByRole('dialog', { name: 'Apnée' })).toBeVisible();
      await expectNoA11yViolations(page, AxeBuilder, expect);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Calques' }).click();
      await expect(page.getByRole('dialog', { name: 'Calques' })).toBeVisible();
      await expectNoA11yViolations(page, AxeBuilder, expect);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Plus d’actions' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoA11yViolations(page, AxeBuilder, expect);
    });
  });
}
