import { describe, expect, it } from 'vitest';
import { createTactic } from './model.ts';
import {
  PLAYER_PREFIX,
  decodeShared,
  sharedCodeFromHash,
  shareUrl,
  shortShareUrl,
} from './share.ts';

/** LE LIEN « POUR LES JOUEURS » (ADR 0035) : même schéma, autre porte. */
describe('le lien pour les joueurs', () => {
  const tactic = createTactic({ id: 't', name: 'Sortie de mur' });

  it('se reconnaît, lisible ou compressé, et porte le même schéma', async () => {
    const url = shareUrl(tactic, 'https://x/', { player: true });
    expect(url.startsWith(`https://x/${PLAYER_PREFIX}`)).toBe(true);
    const shared = sharedCodeFromHash(url.slice('https://x/'.length));
    expect(shared).toMatchObject({ compressed: false, player: true });
    const back = await decodeShared(shared!, {
      id: 'u',
      now: tactic.updatedAt,
    });
    expect(back.name).toBe('Sortie de mur');

    const short = await shortShareUrl(tactic, 'https://x/', { player: true });
    expect(sharedCodeFromHash(short.slice('https://x/'.length))?.player).toBe(
      true
    );
  });

  it('un lien ordinaire reste un lien pour modifier', () => {
    const url = shareUrl(tactic, 'https://x/');
    expect(sharedCodeFromHash(url.slice('https://x/'.length))?.player).toBe(
      undefined
    );
  });
});
