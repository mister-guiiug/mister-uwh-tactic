import { describe, expect, it } from 'vitest';
import { describeStep, type StepWords } from './describe.ts';
import { createTactic, playerId, type Tactic } from './model.ts';

const words: StepWords = {
  name: p => p.name || `${p.team === 'blanc' ? 'Blanc' : 'Noir'} ${p.number}`,
  start: 'Position de départ.',
  nobody: 'Personne ne bouge.',
  forward: (p, m) => `${p} avance de ${m} m.`,
  back: (p, m) => `${p} recule de ${m} m.`,
  side: (p, m) => `${p} se décale de ${m} m.`,
  dives: p => `${p} descend au fond.`,
  surfaces: p => `${p} remonte.`,
  pass: (a, b) => `${a} passe à ${b}.`,
  flick: (a, b) => `${a} fait un flick vers ${b}.`,
  takes: p => `${p} prend le palet.`,
  drops: p => `${p} lâche le palet.`,
  has: p => `${p} a le palet.`,
  others: n => `Et ${n} autres bougent.`,
};

const W1 = playerId('blanc', 1);
const W3 = playerId('blanc', 3);
const B2 = playerId('noir', 2);

/** Un schéma de deux étapes, la seconde retouchée par `edit`. */
function phase(edit: (next: Tactic['steps'][number]) => void): Tactic {
  const tactic = createTactic({ id: 't', name: '' });
  const next = structuredClone(tactic.steps[0]!);
  next.arrows = [];
  edit(next);
  tactic.steps.push(next);
  return tactic;
}

describe('l’étape racontée', () => {
  it('la première étape : la position de départ, et qui a le palet', () => {
    const tactic = createTactic({ id: 't', name: '' });
    expect(describeStep(tactic, 0, words)).toEqual(['Position de départ.']);
    tactic.steps[0]!.carrier = W3;
    expect(describeStep(tactic, 0, words)).toEqual([
      'Position de départ.',
      'Blanc 3 a le palet.',
    ]);
  });

  it('une étape copiée sans changement : personne ne bouge', () => {
    expect(
      describeStep(
        phase(() => {}),
        1,
        words
      )
    ).toEqual(['Personne ne bouge.']);
  });

  it('les Blancs avancent vers la droite, les Noirs vers la gauche', () => {
    const tactic = phase(next => {
      next.poses[W1] = { ...next.poses[W1]!, x: next.poses[W1]!.x + 4 };
      next.poses[B2] = { ...next.poses[B2]!, x: next.poses[B2]!.x - 6 };
    });
    expect(describeStep(tactic, 1, words)).toEqual([
      'Noir 2 avance de 6 m.',
      'Blanc 1 avance de 4 m.',
    ]);
  });

  it('une phase retournée change le sens d’attaque', () => {
    const tactic = phase(next => {
      next.poses[W1] = { ...next.poses[W1]!, x: next.poses[W1]!.x + 4 };
    });
    // Les Blancs commencent à droite : aller vers la droite, c'est reculer.
    for (const step of tactic.steps) {
      for (const [id, pose] of Object.entries(step.poses)) {
        if (id.startsWith('blanc')) pose.x = tactic.pitch.length - pose.x;
      }
    }
    expect(describeStep(tactic, 1, words)).toEqual(['Blanc 1 avance de 4 m.']);
  });

  it('le palet, la plongée et le décalage, dans cet ordre', () => {
    const tactic = phase(next => {
      next.poses[W3] = {
        ...next.poses[W3]!,
        y: next.poses[W3]!.y + 3,
        surface: false,
      };
      next.carrier = W3;
    });
    tactic.steps[0]!.carrier = W1;
    expect(describeStep(tactic, 1, words)).toEqual([
      'Blanc 1 passe à Blanc 3.',
      'Blanc 3 descend au fond.',
      'Blanc 3 se décale de 3 m.',
    ]);
  });

  it('un flick, s’il est fléché à l’étape d’avant', () => {
    const tactic = phase(next => {
      next.carrier = W3;
    });
    tactic.steps[0]!.carrier = W1;
    tactic.steps[0]!.arrows = [
      { kind: 'flick', from: { x: 1, y: 1 }, to: { x: 5, y: 5 } },
    ];
    expect(describeStep(tactic, 1, words)[0]).toBe(
      'Blanc 1 fait un flick vers Blanc 3.'
    );
  });

  it('un prénom remplace le numéro', () => {
    const tactic = phase(next => {
      next.poses[W1] = { ...next.poses[W1]!, x: next.poses[W1]!.x + 2 };
    });
    tactic.roster.players.find(p => p.id === W1)!.name = 'Léa';
    expect(describeStep(tactic, 1, words)).toEqual(['Léa avance de 2 m.']);
  });

  it('au plus quatre déplacements, le reste compté', () => {
    const tactic = phase(next => {
      for (let n = 1; n <= 6; n += 1) {
        const id = playerId('blanc', n);
        next.poses[id] = { ...next.poses[id]!, x: next.poses[id]!.x + n };
      }
    });
    const lines = describeStep(tactic, 1, words);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe('Blanc 6 avance de 6 m.');
    expect(lines[4]).toBe('Et 2 autres bougent.');
  });
});
