import { describe, expect, it } from 'vitest';
import {
  createTactic,
  MAX_LINE_STEPS,
  playerId,
  tacticSchema,
  type Step,
  type Tactic,
} from './model.ts';
import {
  addVariant,
  forkAt,
  forksOn,
  insertStep,
  lineLength,
  lineOf,
  linesOf,
  mapLines,
  removeStepAt,
  removeVariant,
  renameLine,
  settleDocument,
  settleVariants,
  sharedPrefix,
  swapSteps,
  tourNext,
  variantRefusal,
  writeLine,
} from './variants.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);

/** Une étape repérable par sa consigne. */
const noted = (base: Step, note: string): Step => ({
  ...structuredClone(base),
  note,
});

/**
 * Une phase de trois étapes A B C, et une variante « Leur 2 monte » qui part
 * de B (index 1) avec X Y.
 */
function phase(): Tactic {
  const t = createTactic({ id: 't', name: 'Sortie', now: '2026-11-21' });
  const a = t.steps[0]!;
  t.steps = [noted(a, 'A'), noted(a, 'B'), noted(a, 'C')];
  t.variants = [
    {
      id: 'v',
      name: 'Leur 2 monte',
      from: 1,
      steps: [noted(a, 'X'), noted(a, 'Y')],
    },
  ];
  return t;
}

const notes = (t: Tactic) => t.steps.map(s => s.note);

describe('les variantes : le modèle', () => {
  it('sont facultatives : un schéma sans variante reste lui-même', () => {
    const t = createTactic({ id: 't', name: '' });
    expect(t).not.toHaveProperty('variants');
    expect(lineOf(t, null)).toBe(t);
    expect(tacticSchema.parse(t)).not.toHaveProperty('variants');
  });

  it('le schéma zod les accepte, sans changer de version', () => {
    const t = phase();
    t.mainLine = 'Relais au fond';
    const parsed = tacticSchema.parse(t);
    expect(parsed.variants).toHaveLength(1);
    expect(parsed.mainLine).toBe('Relais au fond');
  });

  it('un lecteur qui ne les connaît pas joue la ligne principale', () => {
    // Le schéma d'avant : sans `variants` ni `mainLine`. Zod retire ce qu'il
    // ne connaît pas — et il reste la ligne principale, entière.
    const before = tacticSchema.omit({ variants: true, mainLine: true });
    const old = before.parse(phase());
    expect(old).not.toHaveProperty('variants');
    expect(notes(old as Tactic)).toEqual(['A', 'B', 'C']);
  });
});

describe('les variantes : la ligne aplatie', () => {
  it('les étapes communes, puis celles de la variante', () => {
    const t = phase();
    expect(notes(lineOf(t, null))).toEqual(['A', 'B', 'C']);
    expect(notes(lineOf(t, 'v'))).toEqual(['A', 'B', 'X', 'Y']);
    expect(lineLength(t, 'v')).toBe(4);
  });

  it('une ligne aplatie ne porte ni les variantes ni le nom de la principale', () => {
    const t = { ...phase(), mainLine: 'Relais' };
    for (const line of [null, 'v']) {
      const flat = lineOf(t, line);
      expect(flat).not.toHaveProperty('variants');
      expect(flat).not.toHaveProperty('mainLine');
    }
  });

  it('une ligne inconnue se lit comme la principale', () => {
    expect(notes(lineOf(phase(), 'disparue'))).toEqual(['A', 'B', 'C']);
  });

  it('les étapes que deux lignes partagent', () => {
    const t = phase();
    t.variants!.push({ ...t.variants![0]!, id: 'w', from: 0 });
    expect(sharedPrefix(t, null, 'v')).toBe(2);
    expect(sharedPrefix(t, 'v', 'w')).toBe(1);
    expect(sharedPrefix(t, 'v', 'v')).toBe(4);
  });
});

describe('les variantes : une retouche s’écrit à sa place', () => {
  it('sur une étape commune, à la principale — toutes les lignes la voient', () => {
    const t = phase();
    const line = lineOf(t, 'v');
    const retouched = {
      ...line,
      name: 'Sortie de mur',
      steps: line.steps.map((s, i) => (i === 0 ? { ...s, note: 'A2' } : s)),
    };
    const doc = writeLine(t, 'v', retouched);
    expect(notes(doc)).toEqual(['A2', 'B', 'C']);
    expect(notes(lineOf(doc, 'v'))).toEqual(['A2', 'B', 'X', 'Y']);
    expect(doc.name).toBe('Sortie de mur');
    expect(doc.variants![0]!.name).toBe('Leur 2 monte');
  });

  it('sur une étape de la variante, à elle seule', () => {
    const t = phase();
    const line = lineOf(t, 'v');
    const retouched = {
      ...line,
      steps: line.steps.map((s, i) => (i === 3 ? { ...s, note: 'Y2' } : s)),
    };
    const doc = writeLine(t, 'v', retouched);
    expect(notes(doc)).toEqual(['A', 'B', 'C']);
    expect(notes(lineOf(doc, 'v'))).toEqual(['A', 'B', 'X', 'Y2']);
    // La principale garde ses étapes, les mêmes objets.
    expect(doc.steps[2]).toBe(t.steps[2]);
  });

  it('sur la principale, les variantes suivent le document', () => {
    const t = phase();
    const doc = writeLine(t, null, { ...lineOf(t, null), name: 'Autre' });
    expect(doc.variants).toBe(t.variants);
    expect(doc.name).toBe('Autre');
  });
});

describe('les variantes : ajouter, retirer, déplacer une étape', () => {
  const blank = (note: string) => noted(phase().steps[0]!, note);

  it('après l’embranchement, l’étape va à la variante', () => {
    const doc = insertStep(phase(), 'v', 2, blank('N'))!;
    expect(notes(lineOf(doc, 'v'))).toEqual(['A', 'B', 'N', 'X', 'Y']);
    expect(notes(doc)).toEqual(['A', 'B', 'C']);
  });

  it('avant, elle va à la principale, et la variante garde ses étapes communes', () => {
    const doc = insertStep(phase(), 'v', 1, blank('N'))!;
    expect(notes(doc)).toEqual(['A', 'N', 'B', 'C']);
    expect(doc.variants![0]!.from).toBe(2);
    expect(notes(lineOf(doc, 'v'))).toEqual(['A', 'N', 'B', 'X', 'Y']);
  });

  it('sur la principale, juste après l’embranchement, la variante ne bouge pas', () => {
    const doc = insertStep(phase(), null, 2, blank('N'))!;
    expect(notes(doc)).toEqual(['A', 'B', 'N', 'C']);
    expect(notes(lineOf(doc, 'v'))).toEqual(['A', 'B', 'X', 'Y']);
  });

  it('refuse une ligne de plus de trente étapes', () => {
    const t = phase();
    t.variants![0]!.steps = Array.from({ length: MAX_LINE_STEPS - 2 }, () =>
      blank('Z')
    );
    expect(lineLength(t, 'v')).toBe(MAX_LINE_STEPS);
    expect(insertStep(t, 'v', 3, blank('N'))).toBeNull();
    // Même par la principale : la variante en hériterait.
    expect(insertStep(t, null, 1, blank('N'))).toBeNull();
  });

  it('retire une étape de la variante, puis la variante avec sa dernière', () => {
    const once = removeStepAt(phase(), 'v', 2)!;
    expect(notes(lineOf(once.doc, 'v'))).toEqual(['A', 'B', 'Y']);
    const twice = removeStepAt(once.doc, 'v', 2)!;
    expect(twice.line).toBeNull();
    expect(twice.doc).not.toHaveProperty('variants');
  });

  it('une étape commune retirée : la variante part de la précédente', () => {
    const done = removeStepAt(phase(), 'v', 1)!;
    expect(notes(done.doc)).toEqual(['A', 'C']);
    expect(notes(lineOf(done.doc, 'v'))).toEqual(['A', 'X', 'Y']);
    // Depuis la principale, une étape après l'embranchement ne la touche pas.
    const after = removeStepAt(phase(), null, 2)!;
    expect(notes(lineOf(after.doc, 'v'))).toEqual(['A', 'B', 'X', 'Y']);
  });

  it('refuse de retirer la seule étape commune d’une variante', () => {
    const t = phase();
    t.variants![0]!.from = 0;
    expect(removeStepAt(t, 'v', 0)).toBeNull();
  });

  it('échange deux étapes du même côté, jamais par-dessus l’embranchement', () => {
    expect(notes(lineOf(swapSteps(phase(), 'v', 2, 3)!, 'v'))).toEqual([
      'A',
      'B',
      'Y',
      'X',
    ]);
    expect(swapSteps(phase(), 'v', 1, 2)).toBeNull();
    // Dans les étapes communes : la principale change, la variante reste
    // attachée à la même position.
    const doc = swapSteps(phase(), 'v', 0, 1)!;
    expect(notes(doc)).toEqual(['B', 'A', 'C']);
    expect(notes(lineOf(doc, 'v'))).toEqual(['B', 'A', 'X', 'Y']);
  });

  it('une transformation de tout le document touche chaque ligne', () => {
    const doc = mapLines(phase(), line => ({
      ...line,
      steps: line.steps.map(s => ({ ...s, note: s.note.toLowerCase() })),
    }));
    expect(notes(doc)).toEqual(['a', 'b', 'c']);
    expect(notes(lineOf(doc, 'v'))).toEqual(['a', 'b', 'x', 'y']);
  });
});

describe('les variantes : naître, se nommer, partir', () => {
  it('naît de l’étape courante, copie sans consigne ni flèches', () => {
    const t = phase();
    t.steps[2]!.arrows = [
      { kind: 'pass', from: { x: 1, y: 1 }, to: { x: 3, y: 3 } },
    ];
    const made = addVariant(t, null, 2, 'w')!;
    expect(made.line).toBe('w');
    const variant = made.doc.variants![1]!;
    expect(variant).toMatchObject({ id: 'w', name: '', from: 2 });
    expect(variant.steps).toHaveLength(1);
    expect(variant.steps[0]!.note).toBe('');
    expect(variant.steps[0]!.arrows).toEqual([]);
    expect(variant.steps[0]!.poses[W1]).toEqual(t.steps[2]!.poses[W1]);
  });

  it('pas de variante d’une variante, ni plus de six', () => {
    const t = phase();
    expect(variantRefusal(t, 'v', 3)).toBe('nested');
    // Sur une étape commune d'une variante, elle part de la principale.
    expect(variantRefusal(t, 'v', 1)).toBeNull();
    expect(addVariant(t, 'v', 1, 'w')!.doc.variants![1]!.from).toBe(1);
    t.variants = Array.from({ length: 6 }, (_, i) => ({
      ...t.variants![0]!,
      id: `v${i}`,
    }));
    expect(variantRefusal(t, null, 0)).toBe('full');
    expect(addVariant(t, null, 0, 'w')).toBeNull();
  });

  it('se renomme ; la principale aussi, et un nom vide s’efface', () => {
    let doc = renameLine(phase(), 'v', 'Leur 2 reste');
    expect(doc.variants![0]!.name).toBe('Leur 2 reste');
    doc = renameLine(doc, null, 'Relais au fond');
    expect(doc.mainLine).toBe('Relais au fond');
    doc = renameLine(doc, null, '');
    expect(doc).not.toHaveProperty('mainLine');
    expect(
      renameLine(phase(), 'v', 'x'.repeat(99)).variants![0]!.name
    ).toHaveLength(40);
  });

  it('la dernière partie, le schéma redevient ce qu’il était', () => {
    const doc = removeVariant({ ...phase(), mainLine: 'Relais' }, 'v');
    expect(doc).not.toHaveProperty('variants');
    expect(doc).not.toHaveProperty('mainLine');
  });
});

describe('les variantes : remises en règle', () => {
  it('une variante qui part au-delà de la principale part de sa dernière étape', () => {
    const t = phase();
    t.variants![0]!.from = 9;
    expect(settleVariants(t).variants![0]!.from).toBe(2);
  });

  it('une ligne trop longue est raccourcie, un identifiant doublé retiré', () => {
    const t = phase();
    const long = Array.from({ length: 29 }, () => noted(t.steps[0]!, 'Z'));
    t.variants = [
      { ...t.variants![0]!, steps: long },
      { ...t.variants![0]!, name: 'doublon' },
    ];
    const settled = settleVariants(t);
    expect(settled.variants).toHaveLength(1);
    expect(lineLength(settled, 'v')).toBe(MAX_LINE_STEPS);
  });

  it('rien à reprendre : le même document', () => {
    const t = phase();
    expect(settleVariants(t)).toBe(t);
    expect(settleDocument(t)).toBe(t);
  });

  it('le palet suit la crosse de son porteur, sur la variante aussi', () => {
    const t = phase();
    const own = t.variants![0]!.steps[0]!;
    own.poses[W1] = { ...own.poses[W1]!, x: 8, y: 7, surface: false };
    own.carrier = W1;
    own.puck = { x: 0, y: 0 };
    const settled = settleDocument(t);
    expect(settled.variants![0]!.steps[0]!.puck.x).toBeGreaterThan(8);
  });

  it('la première étape d’une variante courbe une nage depuis l’embranchement', () => {
    const t = phase();
    const own = t.variants![0]!.steps[0]!;
    // W2 bouge entre B (l'embranchement) et X : sa courbe tient.
    own.poses[W2] = { ...own.poses[W2]!, x: 6, y: 3 };
    own.curves = { [W2]: { x: 2, y: 8 }, [W1]: { x: 2, y: 8 } };
    const settled = settleDocument(t);
    // W1 ne bouge pas : sa courbe tombe ; celle de W2 reste.
    expect(settled.variants![0]!.steps[0]!.curves).toEqual({
      [W2]: { x: 2, y: 8 },
    });
  });
});

describe('les variantes : embranchements et parcours', () => {
  it('la frise marque où la phase se sépare, selon la ligne', () => {
    const t = phase();
    t.variants!.push({ ...t.variants![0]!, id: 'w', from: 2 });
    expect([...forksOn(t, null)].sort()).toEqual([1, 2]);
    // Sur « v », l'embranchement de « w » vient après le sien : hors ligne.
    expect([...forksOn(t, 'v')]).toEqual([1]);
  });

  it('à l’embranchement, la principale et les variantes qui en partent', () => {
    const t = phase();
    expect(forkAt(t, null, 1)).toEqual({ options: [null, 'v'], current: null });
    expect(forkAt(t, 'v', 1)).toEqual({ options: [null, 'v'], current: 'v' });
    expect(forkAt(t, null, 0)).toBeNull();
    expect(forkAt(t, 'v', 2)).toBeNull();
  });

  it('la télécommande parcourt les lignes dans l’ordre de la frise', () => {
    const t = phase();
    t.variants!.push({ ...t.variants![0]!, id: 'w', from: 0 });
    expect(linesOf(t).map(l => l.id)).toEqual([null, 'v', 'w']);
    expect(tourNext(t, null)).toEqual({ line: 'v', step: 1 });
    expect(tourNext(t, 'v')).toEqual({ line: 'w', step: 0 });
    expect(tourNext(t, 'w')).toBeNull();
  });
});
