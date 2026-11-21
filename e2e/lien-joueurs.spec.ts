import { expect, test } from '@playwright/test';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic, PLAYER_PREFIX } from '../src/features/board/share.ts';

/**
 * LE LIEN « POUR LES JOUEURS » (ADR 0035) : ouvert dans un autre navigateur,
 * il montre la phase en présentation — on tourne les étapes, on ne déplace
 * personne.
 */
function phase() {
  const tactic = createTactic({ id: 'e2e-joueurs', name: 'Sortie de mur' });
  const next = structuredClone(tactic.steps[0]!);
  const id = playerId('blanc', 1);
  next.poses[id] = { ...next.poses[id]!, x: 8 };
  tactic.steps.push(next);
  return tactic;
}

test.describe('@critical le lien pour les joueurs', () => {
  test('s’ouvre en présentation, et la phase se tourne', async ({ page }) => {
    await page.goto(`/${PLAYER_PREFIX}${encodeTactic(phase())}`);
    const presentation = page.getByRole('dialog', { name: /Présenter/ });
    await expect(presentation).toBeVisible();
    await expect(presentation.getByText('Sortie de mur')).toBeVisible();
    await expect(page.getByText(/Phase reçue/)).toBeVisible();
    // En présentation, un jeton n'est pas un bouton qu'on saisit.
    await expect(
      presentation.getByRole('button', { name: /^Blanc 1,/ })
    ).toHaveCount(0);
    await presentation.getByRole('button', { name: 'Étape suivante' }).click();
    await expect(
      presentation.locator('.uwh-timeline__step[aria-current="step"]')
    ).toHaveText('2');
  });

  test('« Lien pour les joueurs » est au menu, et le QR code sait l’ouvrir', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await expect(
      page.getByRole('button', { name: /^Lien pour les joueurs/ })
    ).toBeVisible();
    await page.getByRole('button', { name: /^Afficher le QR code/ }).click();
    const qr = page.getByRole('dialog', { name: /QR/ });
    await qr.getByRole('tab', { name: 'Pour les joueurs' }).click();
    await expect(
      qr.getByRole('tab', { name: 'Pour les joueurs' })
    ).toHaveAttribute('aria-selected', 'true');
    await expect(qr.locator('img')).toBeVisible();
  });
});
