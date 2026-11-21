import { expect, test, type Page } from '@playwright/test';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic } from '../src/features/board/share.ts';

/**
 * LES NAGES COURBES, de bout en bout (ADR 0019, suivi du 21/11/2026) : la
 * poignée courbe la nage au tableau, et la lecture la suit.
 *
 * Les positions se lisent dans l'attribut `transform` du jeton — en mètres
 * du terrain, que le tableau soit couché ou dressé.
 */
const W1 = playerId('blanc', 1);

/** Blanc 1 seul à bouger : au fond, en ligne droite, de (5, 7,5) à (15, 7,5). */
function phase() {
  const t = createTactic({ id: 'e2e-courbe', name: 'Nage courbe' });
  t.counts.noir = 0;
  t.counts.substitutes = { blanc: 0, noir: 0 };
  t.counts.referees = 0;
  t.counts.deckReferee = false;
  t.steps[0]!.poses[W1] = { x: 5, y: 7.5, angle: 0, surface: false };
  const second = structuredClone(t.steps[0]!);
  second.poses[W1] = { x: 15, y: 7.5, angle: 0, surface: false };
  t.steps.push(second);
  return t;
}

/**
 * Le centre d'un élément à l'écran. Lu dans la page : la poignée est un
 * trait d'un millimètre, une boîte vide que `boundingBox()` tient pour
 * invisible.
 */
const centre = (page: Page, selector: string) =>
  page.locator(selector).evaluate(el => {
    const box = el.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });

/** La position de Blanc 1 à chaque image, pendant `ms` millisecondes. */
const record = (page: Page, ms: number) =>
  page.evaluate(
    async ({ id, ms }) => {
      const out: { x: number; y: number }[] = [];
      const end = performance.now() + ms;
      while (performance.now() < end) {
        await new Promise(requestAnimationFrame);
        const transform =
          document
            .querySelector(`[data-token="${id}"] > g`)
            ?.getAttribute('transform') ?? '';
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform);
        if (m) out.push({ x: Number(m[1]), y: Number(m[2]) });
      }
      return out;
    },
    { id: W1, ms }
  );

test.describe('@critical les nages courbes', () => {
  test('une nage courbée au tableau quitte la droite à mi-lecture', async ({
    page,
    isMobile,
  }) => {
    await page.goto(`/#s=${encodeTactic(phase())}`);
    await expect(page.getByLabel('Nom du schéma')).toHaveValue('Nage courbe');

    // L'étape 2, Blanc 1 choisi : la poignée paraît au milieu de sa nage.
    await page.locator('.uwh-timeline__step').nth(1).click();
    await page.getByRole('button', { name: /^Blanc 1,/ }).click();
    const handle = `[data-curve-handle="${W1}"]`;
    const swim = page.locator(`[data-swim="${W1}"]`);
    await expect(page.locator(handle)).toBeAttached();
    await expect(swim).toHaveAttribute('d', / L /);

    // Au doigt, 44 px : un toucher à 20 px du centre l'atteint encore.
    const c = await centre(page, handle);
    const reach = isMobile ? 20 : 12;
    const hit = await page.evaluate(
      ({ x, y }) =>
        Boolean(
          document.elementFromPoint(x, y)?.closest('[data-curve-handle]')
        ),
      { x: c.x + reach, y: c.y }
    );
    expect(hit).toBe(true);

    // Glisser la poignée en biais : couché ou dressé, la nage se courbe.
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 30, c.y + 30, { steps: 4 });
    await page.mouse.move(c.x + 60, c.y + 60, { steps: 4 });
    await page.mouse.up();
    await expect(swim).toHaveAttribute('d', / Q /);

    // Annuler et Rétablir couvrent le geste, d'un seul coup.
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(swim).toHaveAttribute('d', / L /);
    await page.getByRole('button', { name: 'Rétablir' }).click();
    await expect(swim).toHaveAttribute('d', / Q /);

    // Depuis l'étape 1, « Lire » : Blanc 1 image par image.
    await page.locator('.uwh-timeline__step').first().click();
    await page.getByRole('button', { name: 'Lire' }).click();
    const samples = await record(page, 3000);

    // Il arrive à sa place de l'étape 2…
    expect(samples.at(-1)).toEqual({ x: 15, y: 7.5 });
    // … et à mi-lecture, il n'est plus sur la droite y = 7,5.
    const moving = samples.filter(
      p => !(p.x === 5 && p.y === 7.5) && !(p.x === 15 && p.y === 7.5)
    );
    expect(moving.length).toBeGreaterThan(10);
    const middle = moving[Math.floor(moving.length / 2)]!;
    expect(Math.abs(middle.y - 7.5)).toBeGreaterThan(0.5);
  });
});
