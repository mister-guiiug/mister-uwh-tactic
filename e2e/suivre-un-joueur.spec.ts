import { expect, test } from '@playwright/test';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic } from '../src/features/board/share.ts';

/**
 * SUIVRE UN JOUEUR, VOIR TOUTE LA PHASE (ADR 0036) : sa nage d'un trait sur
 * toute la phase, ou toutes les nages, depuis « Calques ».
 */
function phase() {
  const tactic = createTactic({ id: 'e2e-suivre', name: 'Relais' });
  const w1 = playerId('blanc', 1);
  const s1 = structuredClone(tactic.steps[0]!);
  s1.poses[w1] = { ...s1.poses[w1]!, x: 6 };
  const s2 = structuredClone(s1);
  s2.poses[w1] = { ...s2.poses[w1]!, x: 11 };
  tactic.steps.push(s1, s2);
  return tactic;
}

test.describe('@critical suivre un joueur', () => {
  test('sa nage se dessine sur toute la phase, et se lâche', async ({
    page,
  }) => {
    await page.goto(`/#s=${encodeTactic(phase())}`);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('Relais');
    await page
      .getByRole('button', { name: /^Blanc 1,/ })
      .first()
      .click();
    await page.getByRole('tab', { name: /^Jeton/ }).click();
    await page.getByRole('button', { name: 'Suivre sa nage' }).click();

    const path = page.locator(`.uwh-path[data-path="${playerId('blanc', 1)}"]`);
    await expect(path).toHaveCount(1);
    await expect(path.locator('path')).toHaveCount(2);
    const chip = page.locator('.uwh-stage__follow');
    await expect(chip).toContainText('Nage de Blanc 1');

    await chip.getByRole('button', { name: 'Ne plus suivre' }).click();
    await expect(page.locator('.uwh-path')).toHaveCount(0);
  });

  test('« Calques » dessine toutes les nages de la phase', async ({ page }) => {
    await page.goto(`/#s=${encodeTactic(phase())}`);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('Relais');
    await page.getByRole('button', { name: 'Calques', exact: true }).click();
    await page
      .getByRole('switch', { name: 'Les nages de toute la phase' })
      .click();
    await expect(page.locator('.uwh-path')).toHaveCount(1);
  });
});
