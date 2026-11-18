import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic } from '../src/features/board/share.ts';

/**
 * LE TABLEAU, de bout en bout, sur le build de production.
 *
 * Les positions se lisent dans l'attribut `transform` du jeton : c'est ce que
 * l'écran dessine, pas l'état interne du magasin.
 */
const positionOf = async (page: Page, name: string) => {
  const transform = await page
    .getByRole('button', { name, exact: false })
    .first()
    .locator('> g')
    .first()
    .getAttribute('transform');
  const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform ?? '');
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
};

test.describe('@critical le tableau tactique', () => {
  test('un joueur déplacé au clavier garde sa place au rechargement', async ({
    page,
  }) => {
    await page.goto('/');
    const token = page.getByRole('button', { name: /^Blanc 1,/ });
    const before = await positionOf(page, 'Blanc 1,');

    await token.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // Deux pas d'un demi-mètre. LA DIRECTION DÉPEND DE L'ÉCRAN : les flèches
    // suivent l'écran, et sur un téléphone le terrain est dressé — « droite »
    // traverse alors le terrain au lieu de le longer. On mesure la distance.
    const moved = async () => {
      const now = await positionOf(page, 'Blanc 1,');
      return Math.hypot(now.x - before.x, now.y - before.y);
    };
    await expect.poll(moved).toBeCloseTo(1);

    // Le brouillon s'écrit en différé : laisser passer l'écriture.
    await page.waitForTimeout(500);
    await page.reload();
    expect(await moved()).toBeCloseTo(1);
  });

  test('un schéma enregistré se retrouve et se rouvre', async ({ page }) => {
    await page.goto('/');
    const nom = `Sortie de but ${Date.now()}`;
    await page.getByLabel('Nom du schéma').fill(nom);
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText(`« ${nom} » enregistré.`)).toBeVisible();

    await page.getByRole('link', { name: 'Schémas' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: nom })
    ).toBeVisible();

    // Un tableau vierge, puis le schéma rouvert depuis la bibliothèque.
    await page.getByRole('link', { name: 'Tableau' }).click();
    await page.getByRole('button', { name: 'Nouveau' }).click();
    await page.getByRole('button', { name: 'Repartir à zéro' }).click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('');

    await page.getByRole('link', { name: 'Schémas' }).click();
    await page.getByRole('button', { name: 'Ouvrir' }).first().click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(nom);

    // Supprimé sans dialogue, rendu par « Annuler » (ADR 0008).
    await page.getByRole('link', { name: 'Schémas' }).click();
    const carte = page.getByRole('heading', { level: 2, name: nom });
    await page.getByRole('button', { name: `Supprimer « ${nom} »` }).click();
    await expect(carte).toHaveCount(0);
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(carte).toBeVisible();
    await page.reload();
    await expect(carte).toBeVisible();
  });

  test('un lien partagé ouvre le schéma, puis quitte l’adresse', async ({
    page,
  }) => {
    const tactic = createTactic({ id: 'e2e', name: 'Lien reçu' });
    tactic.counts.noir = 3;
    tactic.counts.substitutes = { blanc: 0, noir: 0 };
    tactic.roster.players[0]!.name = 'Loïc';
    tactic.steps[0]!.poses[playerId('blanc', 1)] = {
      x: 10,
      y: 5,
      angle: 0,
      surface: false,
    };

    await page.goto(`/#s=${encodeTactic(tactic)}`);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('Lien reçu');
    await expect(page.getByRole('button', { name: /^Noir \d/ })).toHaveCount(3);
    await expect(
      page.getByRole('button', { name: /^Blanc 1, Loïc, sous l’eau/ })
    ).toBeVisible();
    await expect.poll(() => new URL(page.url()).hash).toBe('');
  });

  test('une composition place les Noirs et nomme leurs postes', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Noirs' }).click();
    await page.getByLabel('Composition', { exact: true }).selectOption('2-2-2');
    await page.getByLabel('Nommer les joueurs d’après leur poste').check();
    await page.getByRole('button', { name: 'Placer l’équipe' }).click();
    await expect(page.getByText('Noirs en 2-2-2.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Noir 1, Av G,/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Noir 6, Ar D,/ })
    ).toBeVisible();
  });

  test('la vue 3D se charge sans erreur', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('tab', { name: '3D' }).click();
    // Avec WebGL, la scène ; sans, le message qui le dit. Jamais une page
    // cassée : le morceau three.js doit se charger et se monter.
    await expect(
      page
        .getByRole('img', { name: /Vue 3D du bassin/ })
        .or(page.getByText(/La 3D n’est pas disponible/))
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('tab', { name: 'Immersion' }).click();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('Annuler ramène un joueur déplacé, Rétablir le repousse', async ({
    page,
  }) => {
    await page.goto('/');
    const before = await positionOf(page, 'Blanc 1,');
    // La distance, pas un axe : sur un téléphone le terrain est dressé.
    const moved = async () => {
      const now = await positionOf(page, 'Blanc 1,');
      return Math.hypot(now.x - before.x, now.y - before.y);
    };
    const token = page.getByRole('button', { name: /^Blanc 1,/ });
    await token.focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(moved).toBeCloseTo(0.5);
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect.poll(moved).toBeCloseTo(0);
    await page.getByRole('button', { name: 'Rétablir' }).click();
    await expect.poll(moved).toBeCloseTo(0.5);
  });

  test('l’outil Passe trace une flèche, listée et supprimable', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Passe' }).click();
    const board = page.getByRole('group', { name: /Terrain de hockey/ });
    // Le geste doit tomber dans la fenêtre : un tableau sous la ligne de
    // flottaison ne reçoit rien.
    await board.scrollIntoViewIfNeeded();
    const box = (await board.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(page.getByText(/^Passe, \d/)).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer la flèche 1' }).click();
    await expect(page.getByText(/^Passe, \d/)).toHaveCount(0);
  });

  test('un tir de pénalité se place selon le règlement', async ({ page }) => {
    await page.goto('/');
    await page
      .getByLabel('Situation', { exact: true })
      .selectOption('penalty-blanc');
    await page.getByRole('button', { name: 'Placer', exact: true }).click();
    await expect(
      page.getByText('Tir de pénalité contre les Blancs : étape replacée.')
    ).toBeVisible();
    // Le défenseur blanc au mur de son but, le palet sur le point de pénalité.
    expect((await positionOf(page, 'Blanc 1,')).x).toBeLessThan(1);
    const puck = page
      .getByRole('button', { name: 'Palet' })
      .locator('circle')
      .last();
    expect(Number(await puck.getAttribute('cx'))).toBeCloseTo(3);
  });

  test('la frise d’apnée signale un joueur resté trop longtemps au fond', async ({
    page,
  }) => {
    await page.goto('/');
    const token = page.getByRole('button', { name: /^Blanc 1,/ });
    await token.focus();
    await page.keyboard.press('s');
    const duration = page.getByLabel(/Durée de l’étape/);
    await duration.fill('10');
    await page.getByRole('button', { name: 'Ajouter une étape' }).click();
    await page.getByLabel(/Durée de l’étape/).fill('10');
    await expect(page.locator('.uwh-apnea td[data-state="over"]')).toHaveCount(
      1
    );
    await expect(
      page.getByRole('button', { name: /^Blanc 1, .*au-delà du seuil/ })
    ).toBeVisible();
  });

  /*
   * LA 3D, VUE ET NON SEULEMENT CHARGÉE. Une scène peut se monter sans
   * erreur et rester noire. On photographie le canevas, et on y cherche ce
   * qu'on doit y voir : l'eau du bassin, et le rouge des arbitres.
   */
  test('la vue 3D montre le bassin et les arbitres', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('tab', { name: '3D' }).click();
    const canvas = page.getByRole('img', { name: /Vue 3D du bassin/ });
    const fallback = page.getByText(/La 3D n’est pas disponible/);
    await expect(canvas.or(fallback)).toBeVisible({ timeout: 15_000 });
    test.skip(await fallback.isVisible(), 'pas de WebGL dans ce navigateur');
    await page.waitForTimeout(1500);
    const png = await canvas.screenshot();
    const { data, info } = await sharp(png)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let water = 0;
    let red = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
      if (b > 150 && g > 150 && r < 200 && b > r + 20) water += 1;
      if (r > 150 && g < 90 && b < 90) red += 1;
    }
    const pixels = info.width * info.height;
    expect(water / pixels).toBeGreaterThan(0.05);
    expect(red).toBeGreaterThan(20);
  });
});
