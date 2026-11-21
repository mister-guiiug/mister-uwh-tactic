import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  decodeShared,
  decodeTactic,
  encodeCompact,
  encodeTactic,
  encodeTacticCompressed,
  toCompact,
} from './share.ts';
import {
  createTactic,
  MARK_TEXT_MAX,
  MAX_WORDS,
  stepSchema,
  tacticSchema,
  type Tactic,
} from './model.ts';
import { fromCompactCarnet, toCompactCarnet } from '../carnet/share.ts';
import { fromCompactSeance, toCompactSeance } from '../seances/share.ts';

/**
 * Ce que ces tests figent : LE LIEN EMPORTE ZONES ET MOTS (ADR 0026), dans
 * la clé `x` qu'un lecteur plus ancien ignore — il ouvre la phase, sans
 * eux, au lieu de la refuser. Le carnet et la séance, qui embarquent la
 * forme compacte d'un schéma, suivent sans rien de plus.
 */

const meta = { id: 'nouveau', now: '2026-11-21T00:00:00Z' };

function plain(): Tactic {
  const t = createTactic({
    id: 'origine',
    name: 'Pressing haut',
    now: '2026-11-21T00:00:00Z',
  });
  t.steps.push(structuredClone(t.steps[0]!));
  return t;
}

function annotated(): Tactic {
  const t = plain();
  t.steps[0]!.zones = [
    { shape: 'rect', x: 2.04, y: 0.96, w: 8, h: 3.01 },
    { shape: 'ellipse', x: 15, y: 5, w: 6, h: 5, label: 'Zone de pressing' },
  ];
  t.steps[1]!.words = [{ x: 12.34, y: 7.06, text: 'Ici on ferme' }];
  return t;
}

describe('le lien emporte zones et mots', () => {
  it('aller-retour, au décimètre, étiquette comprise', () => {
    const back = decodeTactic(encodeTactic(annotated()), meta);
    expect(back.steps[0]!.zones).toEqual([
      { shape: 'rect', x: 2, y: 1, w: 8, h: 3 },
      { shape: 'ellipse', x: 15, y: 5, w: 6, h: 5, label: 'Zone de pressing' },
    ]);
    expect(back.steps[0]!.words).toBeUndefined();
    expect(back.steps[1]!.words).toEqual([
      { x: 12.3, y: 7.1, text: 'Ici on ferme' },
    ]);
    expect(back.steps[1]!.zones).toBeUndefined();
  });

  it('compressé aussi', async () => {
    const code = await encodeTacticCompressed(annotated());
    const back = await decodeShared({ code: code!, compressed: true }, meta);
    expect(back.steps[1]!.words?.[0]?.text).toBe('Ici on ferme');
  });

  it('sans annotation, rien n’est ajouté au lien', () => {
    expect(toCompact(plain()).x).toBeUndefined();
  });

  it('un lecteur plus ancien ouvre la phase, sans zones ni mots', () => {
    // Les annotations vivent dans `x` seulement : les étapes sont celles
    // d'une phase sans elles, octet pour octet.
    const compact = toCompact(annotated());
    expect(compact.x?.zn).toEqual([
      [0, 1, 20, 10, 80, 30],
      [0, 0, 150, 50, 60, 50, 'Zone de pressing'],
    ]);
    expect(compact.x?.mt).toEqual([[1, 123, 71, 'Ici on ferme']]);
    expect(compact.s).toEqual(toCompact(plain()).s);

    // Une clé de `x` inconnue est ignorée : c'est ainsi qu'un lecteur
    // d'avant passe sur `zn` et `mt`.
    const future = { ...toCompact(plain()), x: { zz: [[0, 1, 2]] } };
    const read = decodeTactic(encodeCompact(future), meta);
    expect(read.steps.every(s => !s.zones && !s.words)).toBe(true);

    // Le schéma d'avant (sans `zones` ni `words`) relit un brouillon, un
    // fichier ou une copie synchronisée qui en porte : elles tombent, le
    // reste tient.
    const before = tacticSchema.extend({
      steps: z
        .array(stepSchema.omit({ zones: true, words: true }))
        .min(1)
        .max(30),
    });
    const old = before.parse(annotated());
    expect(old.steps[0]).not.toHaveProperty('zones');
    expect(old.steps[1]).not.toHaveProperty('words');
    expect(old.steps[1]!.poses).toEqual(annotated().steps[1]!.poses);
  });

  it('une entrée illisible ou de trop est ignorée, le lien s’ouvre', () => {
    const forged = {
      ...toCompact(plain()),
      x: {
        zn: [
          [0, 9, 1, 1, 10, 10],
          [7, 0, 1, 1, 10, 10],
          [0, 0, 1, 1, 0, 10],
          [0, 0, 'a', 1, 10, 10],
          'n',
          [1, 1, 10, 10, 30, 20, 'x'.repeat(80)],
        ],
        mt: [
          [0, 10, 10, '   '],
          [0, 10, 10, 42],
          [9, 10, 10, 'Perdu'],
          ...Array.from({ length: MAX_WORDS + 3 }, () => [1, 10, 10, 'Mot']),
        ],
      },
    };
    const read = decodeTactic(encodeCompact(forged), meta);
    expect(read.steps[0]!.zones).toBeUndefined();
    expect(read.steps[1]!.zones).toEqual([
      {
        shape: 'rect',
        x: 1,
        y: 1,
        w: 3,
        h: 2,
        label: 'x'.repeat(MARK_TEXT_MAX),
      },
    ]);
    expect(read.steps[0]!.words).toBeUndefined();
    expect(read.steps[1]!.words).toHaveLength(MAX_WORDS);
  });
});

describe('le carnet et la séance suivent', () => {
  const ids = () => {
    let n = 0;
    return () => `id-${++n}`;
  };

  it('un carnet emporte les zones et les mots de chaque schéma', () => {
    const { schemas } = fromCompactCarnet(
      toCompactCarnet([plain(), annotated()], 'Semaine 48'),
      { newId: ids(), now: meta.now }
    );
    expect(schemas[0]!.steps.every(s => !s.zones && !s.words)).toBe(true);
    expect(schemas[1]!.steps[0]!.zones).toHaveLength(2);
    expect(schemas[1]!.steps[1]!.words?.[0]?.text).toBe('Ici on ferme');
  });

  it('une séance aussi', () => {
    const schema = annotated();
    const { schemas } = fromCompactSeance(
      toCompactSeance(
        {
          id: 'mardi',
          name: 'Mardi',
          items: [{ schemaId: schema.id, minutes: 10, note: '' }],
          updatedAt: meta.now,
        },
        new Map([[schema.id, schema]])
      ),
      { newId: ids(), now: meta.now }
    );
    expect(schemas[0]!.steps[0]!.zones?.[1]?.label).toBe('Zone de pressing');
    expect(schemas[0]!.steps[1]!.words).toHaveLength(1);
  });
});
