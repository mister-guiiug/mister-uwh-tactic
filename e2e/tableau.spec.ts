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

    await page
      .locator('[data-dwc="bottom-nav"]')
      .getByRole('link', { name: 'Schémas' })
      .click();
    await expect(
      page.getByRole('heading', { level: 2, name: nom })
    ).toBeVisible();

    // Un tableau vierge, puis le schéma rouvert depuis la bibliothèque.
    await page
      .locator('[data-dwc="bottom-nav"]')
      .getByRole('link', { name: 'Tableau' })
      .click();
    // « Nouveau schéma » est rangé sous « ⋯ » depuis la refonte (ADR 0016).
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    // Sans dialogue : le tableau repart tout de suite, « Annuler » le rend
    // pendant huit secondes (ADR 0008).
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await expect(
      page.getByText('Tableau vierge, à l’engagement.')
    ).toBeVisible();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('');

    await page
      .locator('[data-dwc="bottom-nav"]')
      .getByRole('link', { name: 'Schémas' })
      .click();
    await page
      .getByRole('button', { name: 'Ouvrir', exact: true })
      .first()
      .click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(nom);

    // Supprimé sans dialogue, rendu par « Annuler » (ADR 0008).
    await page
      .locator('[data-dwc="bottom-nav"]')
      .getByRole('link', { name: 'Schémas' })
      .click();
    const carte = page.getByRole('heading', { level: 2, name: nom });
    // Une action principale par carte ; le reste sous « ⋯ » (ADR 0017).
    await page.getByRole('button', { name: `Actions pour « ${nom} »` }).click();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(carte).toHaveCount(0);
    // La notification de la suppression : celle du tableau vierge, plus haut,
    // a aussi son « Annuler ».
    await page
      .locator('[data-dwc="toast"]', { hasText: 'supprimé' })
      .getByRole('button', { name: 'Annuler' })
      .click();
    await expect(carte).toBeVisible();
    await page.reload();
    await expect(carte).toBeVisible();
  });

  test('un exercice de la bibliothèque s’ouvre avec ses seuls joueurs', async ({
    page,
  }) => {
    await page.goto('/schemas');
    await page.getByRole('button', { name: 'Exemples' }).click();
    const panneau = page.getByRole('dialog', { name: 'Ouvrir un exemple' });
    // Deux groupes nommés : les phases de jeu, puis les exercices.
    await expect(
      panneau.getByRole('list', { name: 'Phases de jeu' })
    ).toBeVisible();
    await panneau
      .getByRole('list', { name: 'Exercices' })
      .getByRole('button', { name: /^Passe à trois en apnée/ })
      .click();

    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Passe à trois en apnée'
    );
    await expect(page.getByRole('button', { name: /^Blanc 3,/ })).toHaveCount(
      1
    );
    // Ni quatrième Blanc, ni Noirs, ni arbitres : l'exercice et lui seul.
    await expect(page.getByRole('button', { name: /^Blanc 4,/ })).toHaveCount(
      0
    );
    await expect(page.getByRole('button', { name: /^Noir 1,/ })).toHaveCount(0);
  });

  test('« Lire » depuis la première étape joue la phase jusqu’au bout', async ({
    page,
  }) => {
    // Le premier pas de la lecture arrivait parfois négatif — l'heure d'une
    // image précède celle lue juste avant — et, depuis la première étape,
    // l'étape −1 faisait planter l'application. Ici, de vraies images.
    await page.goto('/schemas');
    await page.getByRole('button', { name: 'Exemples' }).click();
    await page
      .getByRole('dialog', { name: 'Ouvrir un exemple' })
      .getByRole('list', { name: 'Phases de jeu' })
      .getByRole('button')
      .first()
      .click();

    const courante = page.locator('.uwh-timeline__step[aria-current="step"]');
    await expect(courante).toHaveText('1');
    const etapes = await page.locator('.uwh-timeline__step').count();
    expect(etapes).toBeGreaterThan(1);

    await page.getByRole('button', { name: 'Lire' }).click();
    await expect(courante).toHaveText(String(etapes), { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Lire' })).toBeVisible();
    await expect(page.locator('[data-dwc="error-boundary"]')).toHaveCount(0);
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

  test('le palet donné suit la crosse ; le joueur qui remonte le lâche', async ({
    page,
  }) => {
    // LE PALET EST TOUJOURS AU FOND, ET SON PORTEUR AUSSI (`carry.ts`).
    await page.goto('/');
    await page.getByRole('button', { name: /^Blanc 1,/ }).click();
    await page.getByRole('tab', { name: /^Jeton/ }).click();
    await page.getByRole('button', { name: 'Donner le palet' }).click();

    const porte = page.getByRole('button', {
      name: 'Palet, porté par Blanc 1',
    });
    await expect(porte).toBeVisible();
    // Le donner l'a fait descendre.
    await expect(page.getByRole('tab', { name: 'Sous l’eau' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Il remonte : il lâche le palet, qui reste au fond.
    await page.getByRole('tab', { name: 'En surface' }).click();
    await expect(porte).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Palet', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Donner le palet' })
    ).toBeVisible();
  });

  test('une composition place les Noirs et nomme leurs postes', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Équipes' }).click();
    await page.getByRole('tab', { name: 'Noirs' }).click();
    await page.getByLabel('Composition', { exact: true }).selectOption('2-2-2');
    await page.getByLabel('Nommer les joueurs d’après leur poste').check();
    await page.getByRole('button', { name: 'Placer l’équipe' }).click();
    await expect(page.getByText('Noirs en 2-2-2.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Noir 1, AG,/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Noir 6, ARD,/ })
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
    // La flèche se lit dans l'onglet « Étape » du panneau.
    await page.getByRole('tab', { name: 'Étape' }).click();
    await expect(page.getByText(/^Passe, \d/)).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer la flèche 1' }).click();
    await expect(page.getByText(/^Passe, \d/)).toHaveCount(0);
  });

  test('un tir de pénalité se place selon le règlement', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Règles' }).click();
    await page
      .getByLabel('Situation', { exact: true })
      .selectOption('penalty-blanc');
    await page.getByRole('button', { name: 'Placer', exact: true }).click();
    await expect(
      page.getByText('Tir de pénalité contre les Blancs : étape replacée.')
    ).toBeVisible();
    // Le défenseur blanc au mur de son but, le palet sur le point de pénalité.
    expect((await positionOf(page, 'Blanc 1,')).x).toBeLessThan(1);
    // Le nom EXACT : « Placer les arbitres autour du palet », dans le même
    // onglet, le contient aussi — et son icône a un cercle.
    const puck = page
      .getByRole('button', { name: 'Palet', exact: true })
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
    await page.getByRole('tab', { name: 'Étape' }).click();
    const duration = page.getByLabel(/Durée de l’étape/);
    await duration.fill('10');
    // Deux boutons l'ajoutent : le « + » de la frise, et celui du panneau.
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    await page.getByLabel(/Durée de l’étape/).fill('10');
    // La frise des étapes le signale (ADR 0017), puis la frise d'apnée,
    // ouverte de là, le montre.
    const apnee = page.getByRole('button', { name: /^Apnée/ });
    await expect(apnee).toContainText('1');
    await apnee.click();
    await expect(page.locator('.uwh-apnea td[data-state="over"]')).toHaveCount(
      1
    );
    await expect(
      page.getByRole('button', { name: 'Étape 2, apnée au-delà du seuil' })
    ).toBeVisible();
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

test.describe('@critical les finitions de l’espace de travail', () => {
  test('« Nouveau schéma » repart tout de suite, et « Annuler » rend le tableau', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Nom du schéma').fill('À garder');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('button', { name: /^Nouveau schéma/ }).click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('');
    await page
      .locator('[data-dwc="toast"]', { hasText: 'Tableau vierge' })
      .getByRole('button', { name: 'Annuler' })
      .click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('À garder');
  });

  test('virgule et point changent d’étape, hors d’une saisie', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    const courante = page.locator('.uwh-timeline__step[aria-current="step"]');
    await expect(courante).toHaveText('2');
    await page.locator('body').press(',');
    await expect(courante).toHaveText('1');
    await page.locator('body').press('.');
    await expect(courante).toHaveText('2');
  });

  test('la bibliothèque duplique un schéma et le retrouve par son nom', async ({
    page,
  }) => {
    await page.goto('/');
    const nom = `Écran ${Date.now()}`;
    await page.getByLabel('Nom du schéma').fill(nom);
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText(`« ${nom} » enregistré.`)).toBeVisible();

    await page
      .locator('[data-dwc="bottom-nav"]')
      .getByRole('link', { name: 'Schémas' })
      .click();
    await page.getByRole('button', { name: `Actions pour « ${nom} »` }).click();
    // LE MENU SE VOIT ET SE TOUCHE : posé dans la carte, il était rogné par
    // elle (`overflow`, `content-visibility`) — présent dans la page, mais
    // un toucher en son milieu tombait sur autre chose (relevé en ligne le
    // 18/11/2026). `toBeVisible` ne voit pas un élément rogné.
    const dupliquer = page.getByRole('button', {
      name: 'Dupliquer',
      exact: true,
    });
    expect(
      await dupliquer.evaluate(el => {
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2
        );
        return (
          el.contains(at) &&
          r.left >= 0 &&
          r.right <= window.innerWidth &&
          r.bottom <= window.innerHeight
        );
      })
    ).toBe(true);
    await dupliquer.click();
    const copie = page.getByRole('heading', {
      level: 2,
      name: `${nom} (copie)`,
    });
    await expect(copie).toBeVisible();

    // Sans accent ni majuscule : « ecran » trouve « Écran ».
    await page.getByLabel('Rechercher un schéma').fill('copie');
    await expect(copie).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: nom, exact: true })
    ).toHaveCount(0);
    await page.getByLabel('Rechercher un schéma').fill(`ecran ${nom.slice(6)}`);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2);
  });

  test('sur un téléphone, la barre posée sur le tableau fait plonger le jeton', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'sur grand écran, l’inspecteur est à côté du tableau');
    await page.goto('/');
    await page.getByRole('button', { name: /^Blanc 2,/ }).focus();
    const barre = page.getByRole('group', { name: /^Blanc 2/ });
    await barre.getByRole('button', { name: 'Sous l’eau' }).click();
    await expect(
      page.getByRole('button', { name: /^Blanc 2, sous l’eau/ })
    ).toBeVisible();
    await barre.getByRole('button', { name: 'Détails du jeton' }).click();
    await expect(
      page.getByRole('tab', { name: 'Jeton', exact: true })
    ).toHaveAttribute('aria-selected', 'true');
    // La feuille s'ouvre à mi-hauteur : le terrain reste au-dessus.
    await expect(page.locator('.uwh-panel')).toHaveAttribute(
      'data-sheet',
      'half'
    );
  });

  test('pincer grossit le tableau, « Vue entière » le remet à plat', async ({
    page,
  }) => {
    await page.goto('/');
    const board = page.getByRole('group', { name: /Terrain de hockey/ });
    const avant = await board.getAttribute('viewBox');
    // Deux doigts qui s'écartent : Playwright n'a pas de pincement, on émet
    // les évènements de pointeur que le navigateur enverrait.
    await board.evaluate(svg => {
      const r = svg.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
      const ev = (type: string, id: number, x: number) =>
        svg.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: id,
            pointerType: 'touch',
            isPrimary: id === 1,
            clientX: x,
            clientY: cy,
          })
        );
      ev('pointerdown', 1, cx - 20);
      ev('pointerdown', 2, cx + 20);
      for (let i = 1; i <= 6; i += 1) {
        ev('pointermove', 1, cx - 20 - i * 10);
        ev('pointermove', 2, cx + 20 + i * 10);
      }
      ev('pointerup', 1, cx - 80);
      ev('pointerup', 2, cx + 80);
    });
    await expect(board).not.toHaveAttribute('viewBox', avant!);
    await page.getByRole('button', { name: 'Vue entière' }).click();
    await expect(board).toHaveAttribute('viewBox', avant!);
    await expect(page.getByRole('button', { name: 'Vue entière' })).toHaveCount(
      0
    );
  });
});
