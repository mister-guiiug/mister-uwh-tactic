import { expect, test } from '@playwright/test';

/**
 * LE BANDEAU « MISE À JOUR DISPONIBLE » SE VOIT ET SE TOUCHE, SUR LE TABLEAU.
 *
 * Au téléphone, le socle le fixe juste au-dessus de la barre basse : la place
 * de la feuille de l'inspecteur, qui passait devant. On n'en voyait que le
 * titre, jamais « Mettre à jour » (relevé en ligne le 18/11/2026).
 *
 * LE VRAI BANDEAU, PAS UNE COPIE DE SON BALISAGE. Sur la build de production,
 * le test réinscrit le service worker sous une autre URL de script
 * (`sw.js?…`). Pour le navigateur, c'est une nouvelle version, même à octets
 * égaux : elle s'installe, et le socle montre son bandeau, comme chez
 * l'utilisateur après un déploiement.
 *
 * Servir un `sw.js` modifié ne marche pas : la vérification du script part
 * du navigateur, ni de la page ni du worker, et ni `context.route` ni le
 * `Fetch` de CDP ne la voient (essayé le 18/11/2026).
 */
test.describe('@critical la mise à jour', () => {
  test('le bandeau paraît au-dessus de la feuille, et « Mettre à jour » se touche', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^Blanc 1,/ })).toBeVisible();
    // `ready` se résout quand le worker est ACTIF : la version suivante
    // arrive après lui, comme une mise à jour.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const registration = await navigator.serviceWorker.getRegistration();
      const script = registration?.active?.scriptURL;
      if (!registration || !script) throw new Error('aucun worker actif');
      await navigator.serviceWorker.register(`${script}?une-version-de-plus`, {
        scope: registration.scope,
      });
    });

    const update = page.getByRole('button', {
      name: 'Mettre à jour',
      exact: true,
    });
    await expect(update).toBeVisible({ timeout: 15_000 });
    // Le bandeau monte de 1 rem en entrant (`dwc-rise`) : mesuré en route, il
    // paraîtrait plus bas qu'il ne s'arrête.
    const banner = page.locator('[data-dwc="update-banner"]');
    await banner.evaluate(el =>
      Promise.all(el.getAnimations().map(animation => animation.finished))
    );
    // `toBeVisible` ne voit pas un élément recouvert : on demande à la page ce
    // qu'un toucher au milieu du bouton atteindrait.
    expect(
      await update.evaluate(el => {
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2
        );
        return el.contains(at) && r.bottom <= window.innerHeight;
      })
    ).toBe(true);

    // Au téléphone, il se pose au-dessus de la feuille — fermée, puis à
    // mi-hauteur — et ne couvre pas ses onglets.
    const sheet = page.locator('.uwh-panel[data-sheet]');
    if (await sheet.count()) {
      const above = async () => {
        const box = await banner.boundingBox();
        const panel = await sheet.boundingBox();
        return (box?.y ?? 0) + (box?.height ?? 0) - (panel?.y ?? 0);
      };
      expect(await above()).toBeLessThanOrEqual(0);

      // Fermée, la feuille s'ouvre en touchant un onglet.
      await page.getByRole('tab', { name: /^Équipes/ }).click();
      await expect(sheet).toHaveAttribute('data-sheet', 'half');
      await expect.poll(above).toBeLessThanOrEqual(0);
    }
  });
});
