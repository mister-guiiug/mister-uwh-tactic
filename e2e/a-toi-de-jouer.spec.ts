import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic } from '../src/features/board/share.ts';

/**
 * « À TOI DE JOUER » (ADR 0022), sur le build de production : un joueur
 * rejoue une phase étape par étape, son seul jeton à placer. Le brouillon
 * du tableau n'est jamais touché — il est relu, octet pour octet, à la fin.
 */
const BROUILLON = 'mister-uwh-tactictableau';

const brouillon = (page: Page) =>
  page.evaluate(key => localStorage.getItem(key), BROUILLON);

async function ouvrirLeJeu(page: Page) {
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('button', { name: /^À toi de jouer/ }).click();
  return page.getByRole('dialog', { name: 'À toi de jouer' });
}

test.describe('@critical à toi de jouer', () => {
  test('un exemple se rejoue jusqu’au bilan, sans toucher au brouillon', async ({
    page,
  }) => {
    await page.goto('/schemas');
    await page.getByRole('button', { name: 'Exemples' }).click();
    await page
      .getByRole('dialog', { name: 'Ouvrir un exemple' })
      .getByRole('list', { name: 'Phases de jeu' })
      .getByRole('button', { name: /^Engagement en 3-2-1/ })
      .click();
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Engagement en 3-2-1'
    );
    // Le brouillon est écrit après un court délai : on attend qu'il porte
    // l'exemple avant de le relever.
    await expect.poll(() => brouillon(page)).toContain('Engagement en 3-2-1');
    const avant = await brouillon(page);

    const jeu = await ouvrirLeJeu(page);
    // Aucun jeton sélectionné : la liste de ceux qui bougent.
    const joueurs = jeu.getByRole('list', { name: 'Quel joueur êtes-vous ?' });
    await joueurs.getByRole('button', { name: /^Blanc 3/ }).click();
    await expect(jeu.getByText(/^Blanc 3.*étape 2 sur 3$/)).toBeVisible();

    // Glisser le jeton, au doigt comme à la souris.
    const jeton = jeu.getByRole('button', { name: 'Votre jeton, Blanc 3' });
    await jeton.scrollIntoViewIfNeeded();
    const box = (await jeton.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    const depart = await jeton.getAttribute('style');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 60,
      box.y + box.height / 2 + 40,
      {
        steps: 6,
      }
    );
    await page.mouse.up();
    expect(await jeton.getAttribute('style')).not.toBe(depart);

    // Vérifier : la bonne place paraît, avec l'écart, annoncé.
    await jeu.getByRole('button', { name: 'Vérifier' }).click();
    const annonce = jeu.getByRole('status');
    await expect(annonce).toHaveText(
      /^(Juste|Presque|À revoir) : \d+,\d m de la bonne place\.$/
    );
    await expect(jeton).toHaveCount(0);

    await jeu.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(jeu.getByText(/^Blanc 3.*étape 3 sur 3$/)).toBeVisible();
    await expect(annonce).toHaveText(/Glissez votre jeton/);
    await jeu.getByRole('button', { name: 'Vérifier' }).click();
    await expect(annonce).toHaveText(/de la bonne place\.$/);

    // Le bilan : les étapes justes, l'écart moyen.
    await jeu.getByRole('button', { name: 'Voir le bilan' }).click();
    await expect(annonce).toHaveText(
      /^\d étapes? justes? sur 2\. Écart moyen : \d+,\d m\.$/
    );
    await expect(jeu.getByText(/^Étape 2 : /)).toBeVisible();
    await expect(jeu.getByText(/^Étape 3 : /)).toBeVisible();
    await expect(
      jeu.getByRole('button', { name: 'Recommencer' })
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(jeu).toBeHidden();
    // Le tableau n'a rien vu passer : ni rechargé, ni réenregistré.
    expect(await brouillon(page)).toBe(avant);
  });

  test('un schéma reçu par lien, le jeton sélectionné, au clavier', async ({
    page,
  }) => {
    const tactic = createTactic({ id: 'e2e-a-toi', name: 'Montée au palet' });
    const second = structuredClone(tactic.steps[0]!);
    const id = playerId('blanc', 1);
    second.poses[id] = { ...second.poses[id]!, x: 8, y: 7, surface: false };
    tactic.steps.push(second);
    await page.goto(`/#s=${encodeTactic(tactic)}`);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Montée au palet'
    );
    await page.getByRole('button', { name: /^Blanc 1,/ }).click();

    const jeu = await ouvrirLeJeu(page);
    // Le jeton sélectionné au tableau : la partie part de lui.
    await expect(jeu.getByText('Blanc 1 · étape 2 sur 2')).toBeVisible();
    // axe sur la feuille : avant de vérifier, puis la réponse affichée.
    await expectNoA11yViolations(page, AxeBuilder, expect);
    await jeu.getByRole('button', { name: 'Votre jeton, Blanc 1' }).focus();
    await page.keyboard.press('Enter');
    // De sa place d'engagement (0,6 ; 3,5) à (8 ; 7) : 8,2 m.
    await expect(jeu.getByRole('status')).toHaveText(
      'À revoir : 8,2 m de la bonne place.'
    );
    await expectNoA11yViolations(page, AxeBuilder, expect);
    await expect(
      jeu.getByRole('button', { name: 'Voir le bilan' })
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(jeu.getByRole('status')).toHaveText(
      '0 étape juste sur 1. Écart moyen : 8,2 m.'
    );
  });

  test('une phase d’une seule étape ne propose pas le jeu, et le dit', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    const entree = page.getByRole('button', { name: /^À toi de jouer/ });
    await expect(entree).toBeDisabled();
    await expect(entree).toContainText('Il faut au moins deux étapes.');
  });

  test('Ctrl+Z pendant le jeu n’annule pas la dernière retouche du tableau', async ({
    page,
  }) => {
    await page.goto('/');
    // Une retouche au tableau : le nom du schéma.
    await page.getByLabel('Nom du schéma').fill('Retouche à garder');
    await page
      .getByRole('button', { name: 'Ajouter une étape' })
      .first()
      .click();
    const jeu = await ouvrirLeJeu(page);
    // Une étape copiée : personne ne bouge, le jeu le dit. Un toucher sur
    // cette phrase laisse le focus hors de tout contrôle de la feuille.
    await jeu.getByText('Personne ne bouge pendant cette phase.').click();
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Escape');
    await expect(jeu).toHaveCount(0);
    await expect(page.locator('.uwh-timeline__step')).toHaveCount(2);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue(
      'Retouche à garder'
    );
  });
});
