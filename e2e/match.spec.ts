import { expect, test } from '@playwright/test';

/**
 * LE CHRONO DE MATCH DE BOUT EN BOUT (ADR 0033) : au bord du bassin, on
 * lance la mi-temps, on marque, on exclut, on arrête le chrono — et un
 * rechargement de l'onglet rend le match tel qu'il était, chrono figé au
 * même chiffre, score et exclusion compris.
 */
test.describe('@critical le chrono de match', () => {
  test('démarrer, marquer, exclure, mettre en pause, recharger, retrouver', async ({
    page,
  }) => {
    await page.goto('/match');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Match', exact: true })
    ).toBeVisible();

    const chrono = page.getByRole('timer', { name: /^1re mi-temps/ });
    await expect(chrono).toHaveText('10:00');
    await page.getByRole('button', { name: 'Démarrer le match' }).click();
    // Le temps court : instants, pas décompte, mais l'écran se relit.
    await expect(chrono).toHaveText(/^9:5\d$/);

    await page.getByRole('button', { name: 'Un but pour les Blancs' }).click();
    await expect(page.getByText('Score : Blancs 1, Noirs 0.')).toBeAttached();

    await page.getByRole('button', { name: 'Exclure un joueur' }).click();
    const feuille = page.getByRole('dialog', { name: 'Exclure un joueur' });
    await feuille.getByLabel('Numéro').fill('4');
    await feuille.getByRole('tab', { name: 'Noirs' }).click();
    await feuille.getByRole('button', { name: 'Exclure', exact: true }).click();
    await expect(feuille).toBeHidden();
    const exclusion = page.getByRole('timer', { name: /^N° 4 des Noirs/ });
    await expect(exclusion).toHaveText(/^(2:00|1:5\d)$/);

    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByText('En pause', { exact: true })).toBeVisible();
    const fige = (await chrono.textContent()) ?? '';
    const figeExclusion = (await exclusion.textContent()) ?? '';

    // En pause, le chiffre ne bouge plus — ni avant, ni après le
    // rechargement.
    await page.waitForTimeout(1_500);
    await expect(chrono).toHaveText(fige);
    await page.reload();
    await expect(page.getByText('En pause', { exact: true })).toBeVisible();
    await expect(chrono).toHaveText(fige);
    await expect(exclusion).toHaveText(figeExclusion);
    await expect(page.getByText('Score : Blancs 1, Noirs 0.')).toBeAttached();
    await expect(
      page.getByRole('region', { name: 'Blancs' }).getByText('1', {
        exact: true,
      })
    ).toBeVisible();

    // Repris, le chrono repart d'où il était.
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
    await expect(chrono).not.toHaveText(fige);
    await expect(page.getByText('En pause', { exact: true })).toBeHidden();
  });
});
