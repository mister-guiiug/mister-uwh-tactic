import { describe, expect, it } from 'vitest';
import {
  decodeTactic,
  encodeCompact,
  encodeTactic,
  toCompact,
  type Compact,
} from './share.ts';
import { createTactic, playerId, type Tactic } from './model.ts';
import { fromCompactCarnet, toCompactCarnet } from '../carnet/share.ts';
import { lineOf } from './variants.ts';

const meta = { id: 'reçu', now: '2026-11-21T00:00:00Z' };
const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);

/**
 * Deux étapes sur la principale, et une variante nommée qui part de la
 * première : un porteur, un arrêt de jeu et une nage courbe sur SA première
 * étape — celle qui a un départ, l'étape d'où elle part.
 */
function phase(): Tactic {
  const t = createTactic({ id: 'origine', name: 'Sortie', now: meta.now });
  const a = t.steps[0]!;
  const b = structuredClone(a);
  b.note = 'Relais au fond';
  const x = structuredClone(a);
  x.note = 'Par la gauche';
  x.poses[W2] = { ...x.poses[W2]!, x: 6, y: 3, surface: false };
  x.carrier = W2;
  x.decision = { kind: 'free', team: 'noir' };
  x.curves = { [W2]: { x: 2.5, y: 9.5 } };
  t.steps = [a, b];
  t.mainLine = 'Leur 2 reste';
  t.variants = [{ id: 'v', name: 'Leur 2 monte', from: 0, steps: [x] }];
  return t;
}

describe('le lien porte les variantes', () => {
  it('aller-retour : la principale, la variante et leurs noms', () => {
    const read = decodeTactic(encodeTactic(phase()), meta);
    expect(read.mainLine).toBe('Leur 2 reste');
    expect(read.variants).toHaveLength(1);
    const variant = read.variants![0]!;
    expect(variant).toMatchObject({ name: 'Leur 2 monte', from: 0 });
    const own = variant.steps[0]!;
    expect(own.note).toBe('Par la gauche');
    expect(own.carrier).toBe(W2);
    expect(own.decision).toEqual({ kind: 'free', team: 'noir' });
    // La première étape d'une variante a un départ : sa courbe voyage.
    expect(own.curves).toEqual({ [W2]: { x: 2.5, y: 9.5 } });
    expect(own.poses[W2]).toMatchObject({ x: 6, y: 3, surface: false });
    expect(lineOf(read, variant.id).steps.map(s => s.note)).toEqual([
      '',
      'Par la gauche',
    ]);
  });

  it('un ancien lecteur ne lit que la principale, entière', () => {
    const compact = toCompact(phase());
    // La principale vit dans `s`, les variantes à part dans `x` : un lecteur
    // qui ignore `x.vr` trouve une phase complète.
    expect(compact.s).toHaveLength(2);
    expect(compact.x?.vr).toHaveLength(1);
    const { vr: _vr, vm: _vm, ...known } = compact.x!;
    const old = decodeTactic(encodeCompact({ ...compact, x: known }), meta);
    expect(old).not.toHaveProperty('variants');
    expect(old.steps.map(s => s.note)).toEqual(['', 'Relais au fond']);
  });

  it('un schéma sans variante fait le même lien qu’avant', () => {
    const t = createTactic({ id: 't', name: 'Seul', now: meta.now });
    expect(toCompact(t).x).toBeUndefined();
  });

  it('une variante illisible est ignorée, le reste du lien s’ouvre', () => {
    const compact = toCompact(phase());
    const good = compact.x!.vr![0]!;
    const forged: Compact = {
      ...compact,
      x: {
        ...compact.x,
        vr: [
          'n',
          ['sans étapes', 0, []],
          ['étapes illisibles', 0, [[1, 2]]],
          [42, 0, good[2]],
          good,
        ] as unknown as NonNullable<Compact['x']>['vr'],
      },
    };
    const read = decodeTactic(encodeCompact(forged), meta);
    expect(read.variants).toHaveLength(1);
    expect(read.variants![0]!.name).toBe('Leur 2 monte');
    expect(read.steps).toHaveLength(2);
  });

  it('une variante qui part au-delà de la principale est remise en règle', () => {
    const compact = toCompact(phase());
    compact.x!.vr![0]![1] = 12;
    const read = decodeTactic(encodeCompact(compact), meta);
    expect(read.variants![0]!.from).toBe(1);
  });

  it('le carnet, qui reprend le même format, les emporte aussi', () => {
    const carnet = toCompactCarnet([phase()], 'Semaine 47');
    let n = 0;
    const read = fromCompactCarnet(JSON.parse(JSON.stringify(carnet)), {
      newId: () => `id-${n++}`,
      now: meta.now,
    });
    expect(read.schemas[0]!.variants![0]!.name).toBe('Leur 2 monte');
    expect(read.schemas[0]!.steps[0]!.poses[W1]).toEqual(
      phase().steps[0]!.poses[W1]
    );
  });
});
