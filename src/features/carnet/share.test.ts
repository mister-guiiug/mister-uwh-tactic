import { beforeEach, describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { schemasStore } from '../../backend/local.ts';
import {
  buildExample,
  EXAMPLE_IDS,
  type ExampleId,
} from '../board/examples.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import {
  encodeJson,
  QR_CAPACITY,
  sharedCodeFromHash,
  toCompact,
} from '../board/share.ts';
import { useSchemas } from '../schemas/store.ts';
import { seanceCodeFromHash } from '../seances/link.ts';
import { carnetCodeFromHash } from './link.ts';
import {
  CARNET_LIMITS,
  carnetShareUrl,
  decodeSharedCarnet,
  fromCompactCarnet,
  MESSAGE_LIMIT,
  receiveCarnet,
  toCompactCarnet,
} from './share.ts';

/**
 * Ce que ces tests figent : LE LIEN D'UN CARNET EMPORTE SES SCHÉMAS TELS
 * QU'ILS SONT, dans leur ordre ; ce qui revient entre sous de nouveaux
 * identifiants ; et un lien tronqué ou forgé n'apporte RIEN, pas même la
 * moitié du carnet.
 */

const BASE = 'https://mister-guiiug.github.io/mister-uwh-tactic/';
const NOW = '2026-11-21T10:00:00.000Z';
const NOM = 'Semaine 47 : sorties de but';

/** Un exemple de la bibliothèque, avec ses vrais textes français. */
function exemple(id: ExampleId, n: number): Tactic {
  const texts = fr.schemas.examples[id] as Record<string, string>;
  const notes = Object.keys(texts)
    .filter(key => key.startsWith('note'))
    .sort()
    .map(key => texts[key]!);
  return buildExample(
    id,
    { name: texts.name!, notes },
    { id: `0f8b6c2e-1a3d-4e5f-8a9b-${String(n).padStart(12, '0')}` }
  );
}

/** Les exemples de la bibliothèque, l'ouverture neutre mise à part. */
const EXEMPLES = EXAMPLE_IDS.filter(id => id !== 'neutral').map(exemple);

const sortie = createTactic({ id: 'sortie', name: 'Sortie de mur', now: NOW });
const relais = createTactic({ id: 'relais', name: 'Relais au fond', now: NOW });

function compteur() {
  let n = 0;
  return () => `neuf-${++n}`;
}

const octets = (url: string) => new TextEncoder().encode(url).length;

describe('le lien d’un carnet', () => {
  it('fait l’aller-retour : chaque schéma tel quel, dans l’ordre, sous un nouvel identifiant', () => {
    const envoyes = EXEMPLES.slice(0, 4);
    const recu = fromCompactCarnet(toCompactCarnet(envoyes, NOM), {
      newId: compteur(),
      now: NOW,
    });
    expect(recu.name).toBe(NOM);
    // La forme compacte ne porte ni identifiant ni date : tout le reste y est.
    expect(recu.schemas.map(toCompact)).toEqual(envoyes.map(toCompact));
    expect(recu.schemas.map(s => s.id)).toEqual([
      'neuf-1',
      'neuf-2',
      'neuf-3',
      'neuf-4',
    ]);
  });

  it('garde l’ordre du carnet dans une bibliothèque rangée par date', () => {
    const { schemas } = fromCompactCarnet(toCompactCarnet([sortie, relais]), {
      newId: compteur(),
      now: NOW,
    });
    expect(schemas[0]!.updatedAt).toBe(NOW);
    expect(schemas[1]!.updatedAt < schemas[0]!.updatedAt).toBe(true);
    expect(schemas[1]!.createdAt).toBe(schemas[1]!.updatedAt);
  });

  it('n’emporte un nom que s’il y en a un, et le borne', () => {
    expect('n' in toCompactCarnet([sortie], '   ')).toBe(false);
    expect(toCompactCarnet([sortie], `  ${'x'.repeat(90)}  `).n).toHaveLength(
      CARNET_LIMITS.name
    );
    const sansNom = fromCompactCarnet(toCompactCarnet([sortie]), {
      newId: compteur(),
      now: NOW,
    });
    expect(sansNom.name).toBe('');
  });

  it('se reconnaît au fragment, compressé ou lisible partout', async () => {
    const url = await carnetShareUrl([sortie, relais], NOM, BASE);
    expect(url.startsWith(`${BASE}#zc=`)).toBe(true);
    const shared = carnetCodeFromHash(url.slice(BASE.length))!;
    expect(shared.compressed).toBe(true);
    const recu = await decodeSharedCarnet(shared, {
      newId: compteur(),
      now: NOW,
    });
    expect(recu.schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Relais au fond',
    ]);

    const lisible = encodeJson(toCompactCarnet([sortie], NOM));
    const plain = carnetCodeFromHash(`#sc=${lisible}`)!;
    expect(plain).toEqual({ code: lisible, compressed: false });
    expect(
      (await decodeSharedCarnet(plain, { newId: compteur(), now: NOW })).name
    ).toBe(NOM);
  });

  /**
   * UN LECTEUR D'AVANT — un tableau resté en cache dans le service worker, ou
   * le lecteur d'un schéma, d'une séance — ne prend pas un carnet pour ce
   * qu'il sait lire : il l'ignore. Et le carnet ne se confond avec aucun.
   */
  it('un ancien lecteur l’ignore, et lui ne prend rien pour un carnet', async () => {
    const hash = (await carnetShareUrl([sortie], '', BASE)).slice(BASE.length);
    expect(sharedCodeFromHash(hash)).toBeNull();
    expect(seanceCodeFromHash(hash)).toBeNull();
    expect(sharedCodeFromHash('#sc=abc')).toBeNull();
    expect(seanceCodeFromHash('#sc=abc')).toBeNull();
    for (const autre of ['#s=abc', '#z=abc', '#ss=abc', '#zs=abc', '#c=abc']) {
      expect(carnetCodeFromHash(autre)).toBeNull();
    }
  });

  it('lit un carnet d’une version future qui ajouterait une clé', () => {
    const futur = { ...toCompactCarnet([sortie], NOM), x: { tri: 'nom' } };
    expect(
      fromCompactCarnet(futur, { newId: compteur(), now: NOW }).schemas
    ).toHaveLength(1);
  });

  it('refuse un lien forgé, en entier', () => {
    const valide = toCompact(sortie);
    const forges: unknown[] = [
      null,
      'carnet',
      { v: 2, t: [valide] },
      { v: 1, t: [] },
      { v: 1, t: 'abc' },
      { v: 1, n: 47, t: [valide] },
      { v: 1, t: [valide, null] },
      {
        v: 1,
        t: Array.from({ length: CARNET_LIMITS.schemas + 1 }, () => valide),
      },
      // Un schéma bien formé, puis un bassin hors du règlement : le premier
      // ne passe pas seul.
      { v: 1, t: [valide, { ...valide, p: [999, 15, 2] }] },
      // Une étape qui n'en est pas une.
      { v: 1, t: [{ ...valide, s: 'étape' }] },
    ];
    for (const forge of forges) {
      expect(() =>
        fromCompactCarnet(forge, { newId: compteur(), now: NOW })
      ).toThrow();
    }
  });

  it('refuse un lien tronqué', async () => {
    const lisible = encodeJson(toCompactCarnet(EXEMPLES.slice(0, 3), NOM));
    for (const garde of [0.3, 0.6, 0.99]) {
      await expect(
        decodeSharedCarnet(
          {
            code: lisible.slice(0, Math.floor(lisible.length * garde)),
            compressed: false,
          },
          { newId: compteur(), now: NOW }
        )
      ).rejects.toThrow();
    }
  });

  /**
   * LA LONGUEUR DU LIEN, mesurée sur les exemples de la bibliothèque, dans
   * leur ordre (engagement, entre-deux, attaque à droite, changement d'aile,
   * jeu au mur…), consignes françaises et nom du carnet compris. Relevé du
   * 21/11/2026 : 3 exemples (9 étapes), 1 694 octets ; 5 (18 étapes),
   * 2 741 — sous la capacité d'un QR code (2 953) ; 10 (35 étapes), 5 317,
   * au-delà de ce qu'une messagerie prend sans broncher (`MESSAGE_LIMIT`,
   * 4 096) : la feuille le dit. Sans compression (`#sc=`) : 7 469, 14 044
   * et 28 230. Les bornes ci-dessous laissent voir un format qui enflerait.
   */
  it.each([
    [3, 1_900],
    [5, 2_953],
    [10, 5_800],
  ])('%i exemples : un lien de moins de %i octets', async (n, borne) => {
    const url = await carnetShareUrl(EXEMPLES.slice(0, n), NOM, BASE);
    expect(octets(url)).toBeLessThan(borne);
  });

  it('cinq exemples tiennent dans un QR code ; dix passent la longueur d’un message', async () => {
    const cinq = await carnetShareUrl(EXEMPLES.slice(0, 5), NOM, BASE);
    const dix = await carnetShareUrl(EXEMPLES.slice(0, 10), NOM, BASE);
    expect(octets(cinq)).toBeLessThanOrEqual(QR_CAPACITY);
    expect(octets(dix)).toBeGreaterThan(MESSAGE_LIMIT);
  });
});

describe('un carnet reçu', () => {
  beforeEach(() => {
    localStorage.clear();
    useSchemas.setState({
      schemas: [],
      outside: [],
      ready: false,
      error: null,
    });
  });

  it('entre dans la bibliothèque de l’appareil, sous de nouveaux identifiants', async () => {
    const url = await carnetShareUrl([sortie, relais], NOM, BASE);
    const arrivee = await receiveCarnet(
      carnetCodeFromHash(url.slice(BASE.length))!,
      NOW
    );

    expect(arrivee.name).toBe(NOM);
    expect(arrivee.ids).toHaveLength(2);
    expect(arrivee.ids).not.toContain('sortie');
    const ranges = schemasStore.load().schemas;
    expect(ranges.map(s => s.id).sort()).toEqual([...arrivee.ids].sort());
    expect(useSchemas.getState().schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Relais au fond',
    ]);
  });

  it('forgé, il n’apporte rien — pas même ses schémas valides', async () => {
    const forge = encodeJson({
      v: 1,
      t: [toCompact(sortie), { ...toCompact(relais), p: [999, 15, 2] }],
    });
    await expect(
      receiveCarnet({ code: forge, compressed: false })
    ).rejects.toThrow();
    expect(schemasStore.load().schemas).toEqual([]);
    expect(useSchemas.getState().schemas).toEqual([]);
  });
});
