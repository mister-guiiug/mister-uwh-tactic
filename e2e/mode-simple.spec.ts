import { expect, test, type Page } from '@playwright/test';

/**
 * LE MODE SIMPLE (ADR 0020), choisi par le test lui-même : la suite tourne
 * en mode complet par défaut (`playwright.config.ts`).
 */
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4173',
        localStorage: [
          { name: 'mister-uwh-tactic:mode', value: JSON.stringify('simple') },
        ],
      },
    ],
  },
});

const tokens = (page: Page, name: RegExp) => page.getByRole('button', { name });

test.describe('@critical le mode simple', () => {
  test('six contre six et le palet ; ni outils, ni onglets, ni vitesse', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(tokens(page, /^Blanc 1,/)).toBeVisible();
    await expect(tokens(page, /^Blanc \d+,/)).toHaveCount(6);
    await expect(tokens(page, /^Noir \d+,/)).toHaveCount(6);
    await expect(tokens(page, /remplaçant/)).toHaveCount(0);
    await expect(tokens(page, /^Arbitre/)).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Passe' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^Étape/ })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Vitesse de lecture/ })
    ).toHaveCount(0);
    await expect(
      page.getByText(
        'Touchez un joueur pour le régler ; glissez-le pour le déplacer.'
      )
    ).toBeVisible();
  });

  test('un joueur se règle en toutes lettres, et la passe se trace en deux touchers', async ({
    page,
  }) => {
    await page.goto('/');
    await tokens(page, /^Blanc 1,/).click();
    await page.getByRole('button', { name: 'Descendre au fond' }).click();
    await page.getByRole('button', { name: 'Donner le palet' }).click();
    await expect(
      page.getByRole('button', { name: 'Palet, porté par Blanc 1' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Passe à…' }).click();
    await expect(
      page.getByText('Touchez le joueur qui reçoit la passe.')
    ).toBeVisible();
    await tokens(page, /^Blanc 3,/).click();
    await expect(page.getByText('Passe de Blanc 1 à Blanc 3.')).toBeVisible();
  });

  test('la première phase guidée avance à chaque geste, puis s’efface', async ({
    page,
  }) => {
    await page.goto('/');
    const guide = page.getByRole('region', { name: 'Votre première phase' });
    await expect(guide).toContainText('geste 1 sur 4');

    await tokens(page, /^Blanc 1,/).click();
    await page.getByRole('button', { name: 'Descendre au fond' }).click();
    await expect(guide).toContainText('geste 2 sur 4');
    await page.getByRole('button', { name: 'Donner le palet' }).click();
    await expect(guide).toContainText('geste 3 sur 4');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await expect(guide).toContainText('geste 4 sur 4');
    await page.getByRole('button', { name: 'Lire', exact: true }).click();
    await expect(guide).toContainText('C’est une phase de jeu !');

    await guide.getByRole('button', { name: 'Terminer' }).click();
    await expect(guide).toHaveCount(0);
    await page.reload();
    await expect(tokens(page, /^Blanc 1,/)).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Votre première phase' })
    ).toHaveCount(0);
  });

  test('« Tous les réglages » passe en mode complet, et s’en souvient', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tous les réglages' }).click();
    await expect(page.getByRole('tab', { name: /^Étape/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: /^Étape/ })).toBeVisible();
  });

  test('un toucher entre deux jetons demande lequel', async ({ page }) => {
    await page.goto('/');
    const a = await tokens(page, /^Blanc 1,/)
      .locator('circle')
      .first()
      .boundingBox();
    const b = await tokens(page, /^Blanc 2,/)
      .locator('circle')
      .first()
      .boundingBox();
    // Au milieu des deux centres : dans la zone de toucher de chacun.
    await page.mouse.click(
      (a!.x + a!.width / 2 + b!.x + b!.width / 2) / 2,
      (a!.y + a!.height / 2 + b!.y + b!.height / 2) / 2
    );
    const choix = page.getByRole('group', {
      name: 'Plusieurs jetons ici : lequel ?',
    });
    await expect(choix).toBeVisible();
    await choix.getByRole('button', { name: 'Blanc 2' }).click();
    await expect(choix).toHaveCount(0);
    await expect(tokens(page, /^Blanc 2,/)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('couché, le téléphone donne tout l’écran au tableau', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'le paysage plein écran est celui du téléphone');
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto('/');
    await expect(tokens(page, /^Blanc 1,/)).toBeVisible();
    await expect(page.locator('[data-dwc="bottom-nav"]')).toBeHidden();
  });
});
