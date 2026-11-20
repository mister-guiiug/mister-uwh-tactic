import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createTactic, playerId } from '../src/features/board/model.ts';
import { encodeTactic } from '../src/features/board/share.ts';

/**
 * LA PHASE EN VIDÉO (ADR 0021), sur le build de production, dans Chromium.
 *
 * Le Chromium de Playwright sous Linux n'a pas d'encodeur H.264 : WebCodecs
 * y prend le suivant de la liste (sous Windows, Media Foundation lui en
 * prête un). Un test rejoue partout ce que la CI obtient (VP9), un autre
 * retire WebCodecs pour exercer le repli sur `MediaRecorder`. Partout,
 * `navigator.canShare` est retiré : le fichier part en téléchargement, que
 * Playwright sait recevoir.
 *
 * Le fichier est lu en octets : la durée de la boîte `mvhd`, le codec de la
 * piste. Le cas VP9, que tout Chromium décode, est aussi LU par le
 * navigateur — la preuve qu'il est lisible, et pas seulement bien formé.
 */

/**
 * Deux étapes au rythme de « Lire » (1,6 s par passage, à ×1) : un clip de
 * 1 + 1,6 + 2 = 4,6 s, quelle que soit la durée de jeu de l'étape.
 */
function phase() {
  const tactic = createTactic({ id: 'e2e-video', name: 'Sortie de but' });
  const first = tactic.steps[0]!;
  first.note = 'Blanc 1 plonge et remonte le palet.';
  const second = structuredClone(first);
  const id = playerId('blanc', 1);
  second.poses[id] = { ...second.poses[id]!, x: 12, y: 7, surface: false };
  second.note = 'Il est au fond, au centre.';
  tactic.steps.push(second);
  return tactic;
}

async function exportVideo(page: Page) {
  await page.goto(`/#s=${encodeTactic(phase())}`);
  await expect(page.getByLabel('Nom du schéma')).toHaveValue('Sortie de but');
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page
    .getByRole('button', { name: /^Partager la phase en vidéo/ })
    .click();

  const sheet = page.getByRole('dialog', { name: 'La phase en vidéo' });
  await expect(sheet.getByRole('progressbar')).toBeVisible();
  await expect(sheet.getByRole('status')).toContainText('Vidéo prête', {
    timeout: 60_000,
  });
  const download = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Enregistrer la vidéo' }).click();
  const file = await download;
  await expect(page.getByText('Vidéo enregistrée.')).toBeVisible();
  await expect(sheet).toBeHidden();
  return {
    name: file.suggestedFilename(),
    bytes: await readFile(await file.path()),
  };
}

/** La durée annoncée par la boîte `mvhd`, en secondes. */
function mp4Duration(bytes: Buffer): number {
  const at = bytes.indexOf('mvhd', 0, 'latin1');
  expect(at).toBeGreaterThan(0);
  const v1 = bytes[at + 4] === 1;
  const timescale = bytes.readUInt32BE(at + (v1 ? 24 : 16));
  const duration = v1
    ? Number(bytes.readBigUInt64BE(at + 28))
    : bytes.readUInt32BE(at + 20);
  return duration / timescale;
}

/** Le codec de la piste, lu dans son entrée d'échantillon. */
function mp4Codec(bytes: Buffer): string | undefined {
  return ['avc1', 'vp09', 'av01'].find(
    tag => bytes.indexOf(tag, 0, 'latin1') > 0
  );
}

/**
 * La durée que le navigateur lit en DÉCODANT le fichier : il est lisible.
 * Dans une page vierge : la CSP de l'application refuse une vidéo `blob:`.
 */
async function playedDuration(page: Page, bytes: Buffer): Promise<number> {
  const blank = await page.context().newPage();
  try {
    return await blank.evaluate(async base64 => {
      const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const video = document.createElement('video');
      video.muted = true;
      video.src = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () =>
          reject(new Error(`vidéo illisible : ${video.error?.message}`));
      });
      return video.duration;
    }, bytes.toString('base64'));
  } finally {
    await blank.close();
  }
}

/** Un MP4 de quatre secondes, au trentième près : le rendu n'y est pour rien. */
function expectClipMp4(name: string, bytes: Buffer) {
  expect(name).toBe('sortie-de-but-phase.mp4');
  // Une boîte `ftyp` en tête : un MP4.
  expect(bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');
  expect(Math.abs(mp4Duration(bytes) - 4.6)).toBeLessThanOrEqual(1 / 30);
}

test.describe('@critical la phase en vidéo', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'encodeurs vérifiés dans Chromium');
    await page.addInitScript(() => {
      Reflect.deleteProperty(Navigator.prototype, 'canShare');
    });
  });

  test('WebCodecs rend un MP4 qui dure ce que dure la phase', async ({
    page,
  }) => {
    const { name, bytes } = await exportVideo(page);
    expectClipMp4(name, bytes);
    const codec = mp4Codec(bytes);
    test.info().annotations.push({ type: 'codec', description: codec });
    expect(codec).toBeDefined();
  });

  test('sans H.264, VP9 dans le même MP4', async ({ page }) => {
    // Ce que la CI obtient d'elle-même (Chromium sous Linux), rejoué
    // partout : sous Windows, Media Foundation prête un encodeur H.264.
    await page.addInitScript(() => {
      const probe = VideoEncoder.isConfigSupported.bind(VideoEncoder);
      VideoEncoder.isConfigSupported = config =>
        config.codec.startsWith('avc1')
          ? Promise.resolve({ supported: false, config })
          : probe(config);
    });
    const { name, bytes } = await exportVideo(page);
    expectClipMp4(name, bytes);
    expect(mp4Codec(bytes)).toBe('vp09');
    // Ce Chromium décode VP9 (pas H.264) : la première image se lit.
    expect(await playedDuration(page, bytes)).toBeCloseTo(4.6, 1);
  });

  test('sans WebCodecs, MediaRecorder prend le relais', async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, 'VideoEncoder');
    });
    const { name, bytes } = await exportVideo(page);
    expect(name).toMatch(/^sortie-de-but-phase\.(mp4|webm)$/);
    expect(bytes.length).toBeGreaterThan(1_000);
    const signature = name.endsWith('.webm')
      ? bytes.subarray(0, 4).toString('hex') === '1a45dfa3'
      : bytes.subarray(4, 8).toString('latin1') === 'ftyp';
    expect(signature).toBe(true);
  });
});
