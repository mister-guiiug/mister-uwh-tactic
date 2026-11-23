import { describe, expect, it } from 'vitest';
import {
  PLAYER_PREFIX,
  PLAYER_PREFIX_COMPRESSED,
  SHARE_PREFIX,
  SHARE_PREFIX_COMPRESSED,
  sharedCodeFromHash,
} from '../board/share.ts';
import {
  CARNET_PREFIX,
  CARNET_PREFIX_COMPRESSED,
  carnetCodeFromHash,
} from '../carnet/link.ts';
import {
  SEANCE_PLAYER_PREFIX,
  SEANCE_PLAYER_PREFIX_COMPRESSED,
  SEANCE_PREFIX,
  SEANCE_PREFIX_COMPRESSED,
  seanceCodeFromHash,
} from './link.ts';

/**
 * Ce que ces tests figent : CHAQUE CLÉ DU FRAGMENT N'OUVRE QU'UNE PORTE.
 * Le lien pour les joueurs d'une séance (ADR 0040) ajoute `#ssp=` et
 * `#zsp=` à huit clés déjà parties dans des messages ; aucune ne doit en
 * avaler une autre, ni lire son code décalé d'une lettre.
 */

/** Chaque clé, et ce que doit en lire le lecteur qui la reconnaît. */
const CLES = [
  { cle: SHARE_PREFIX, lecteur: 'schéma', compressed: false, player: false },
  {
    cle: SHARE_PREFIX_COMPRESSED,
    lecteur: 'schéma',
    compressed: true,
    player: false,
  },
  { cle: PLAYER_PREFIX, lecteur: 'schéma', compressed: false, player: true },
  {
    cle: PLAYER_PREFIX_COMPRESSED,
    lecteur: 'schéma',
    compressed: true,
    player: true,
  },
  { cle: SEANCE_PREFIX, lecteur: 'séance', compressed: false, player: false },
  {
    cle: SEANCE_PREFIX_COMPRESSED,
    lecteur: 'séance',
    compressed: true,
    player: false,
  },
  {
    cle: SEANCE_PLAYER_PREFIX,
    lecteur: 'séance',
    compressed: false,
    player: true,
  },
  {
    cle: SEANCE_PLAYER_PREFIX_COMPRESSED,
    lecteur: 'séance',
    compressed: true,
    player: true,
  },
  { cle: CARNET_PREFIX, lecteur: 'carnet', compressed: false, player: false },
  {
    cle: CARNET_PREFIX_COMPRESSED,
    lecteur: 'carnet',
    compressed: true,
    player: false,
  },
] as const;

const LECTEURS = {
  schéma: sharedCodeFromHash,
  séance: seanceCodeFromHash,
  carnet: carnetCodeFromHash,
} as const;

describe('les clés du fragment', () => {
  it('sont toutes différentes, et aucune n’est le début d’une autre', () => {
    const cles = CLES.map(c => c.cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const a of cles) {
      for (const b of cles) {
        if (a !== b) expect(b.startsWith(a), `${a} avale ${b}`).toBe(false);
      }
    }
  });

  it.each(CLES)(
    '$cle n’est lue que par le lecteur de $lecteur, le code entier',
    ({ cle, lecteur, compressed, player }) => {
      const hash = `${cle}abc-_123`;
      for (const [nom, lire] of Object.entries(LECTEURS)) {
        const lu = lire(hash);
        if (nom !== lecteur) {
          expect(lu, `${nom} lit ${cle}`).toBeNull();
          continue;
        }
        expect(lu).not.toBeNull();
        expect(lu!.code).toBe('abc-_123');
        expect(lu!.compressed).toBe(compressed);
        expect('player' in lu! && lu.player === true).toBe(player);
      }
    }
  );

  it('#ss= n’avale pas #ssp=, et #ssp= n’avale pas #ss=', () => {
    expect(seanceCodeFromHash('#ssp=xyz')).toEqual({
      code: 'xyz',
      compressed: false,
      player: true,
    });
    expect(seanceCodeFromHash('#ss=xyz')).toEqual({
      code: 'xyz',
      compressed: false,
    });
    expect(seanceCodeFromHash('#zsp=xyz')).toEqual({
      code: 'xyz',
      compressed: true,
      player: true,
    });
    expect(seanceCodeFromHash('#zs=xyz')).toEqual({
      code: 'xyz',
      compressed: true,
    });
    // Un code qui commencerait par « p » reste un code, pas une clé.
    expect(seanceCodeFromHash('#ss=p=xyz')).toEqual({
      code: 'p=xyz',
      compressed: false,
    });
  });

  it('une clé voisine, inconnue, n’ouvre rien', () => {
    for (const hash of ['#sps=a', '#ssc=a', '#zzs=a', '#ssp', '#s', '']) {
      for (const lire of Object.values(LECTEURS)) {
        expect(lire(hash), hash).toBeNull();
      }
    }
  });
});
