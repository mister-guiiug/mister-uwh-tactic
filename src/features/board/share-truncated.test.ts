import { describe, expect, it } from 'vitest';
import { decodeJsonCompressed, encodeJsonCompressed } from './share.ts';

/**
 * UN LIEN COMPRESSÉ TRONQUÉ (copié à moitié d'une messagerie) est refusé —
 * et sans rejet non géré : Vitest fait échouer la suite au premier
 * « Unhandled Rejection », ce que laissaient l'écriture et la fermeture du
 * flux de décompression avant leur `catch`.
 */
describe('un lien compressé tronqué', () => {
  it('est refusé, sans rejet non géré', async () => {
    const code = await encodeJsonCompressed({
      n: 'Semaine 47',
      t: Array.from({ length: 40 }, (_, i) => ({ i, x: i * 1.5, y: 7.5 })),
    });
    expect(code).not.toBeNull();
    const tronque = code!.slice(0, Math.floor(code!.length / 2));
    await expect(decodeJsonCompressed(tronque)).rejects.toThrow();
    // Laisser aux rejets éventuels le temps d'être signalés.
    await new Promise(resolve => setTimeout(resolve, 20));
  });
});
