import { describe, expect, it } from 'vitest';
import { pathsOf } from './frame.ts';
import { createTactic, playerId, type Tactic } from './model.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);

/** Trois étapes : Blanc 1 nage deux fois, Blanc 2 une fois, en courbe. */
function phase(): Tactic {
  const tactic = createTactic({ id: 't', name: '' });
  const s1 = structuredClone(tactic.steps[0]!);
  s1.poses[W1] = { ...s1.poses[W1]!, x: 6 };
  s1.poses[W2] = { ...s1.poses[W2]!, x: 7 };
  s1.curves = { [W2]: { x: 4, y: 1 } };
  const s2 = structuredClone(s1);
  s2.curves = undefined;
  s2.poses[W1] = { ...s2.poses[W1]!, x: 10 };
  tactic.steps.push(s1, s2);
  return tactic;
}

describe('la phase en traits', () => {
  it('chaque joueur qui bouge, ses nages dans l’ordre des étapes', () => {
    const paths = pathsOf(phase());
    const w1 = paths.find(p => p.id === W1)!;
    expect(w1.swims.map(s => s.step)).toEqual([1, 2]);
    expect(w1.swims[1]!.now.x).toBeCloseTo(10);
    const w2 = paths.find(p => p.id === W2)!;
    expect(w2.swims).toHaveLength(1);
    // La nage courbe garde son point de contrôle.
    expect(w2.swims[0]!.control).toEqual({ x: 4, y: 1 });
  });

  it('suivre un joueur : sa nage seulement', () => {
    const paths = pathsOf(phase(), [W2]);
    expect(paths.map(p => p.id)).toEqual([W2]);
  });

  it('une phase d’une étape n’a pas de trait', () => {
    expect(pathsOf(createTactic({ id: 'u', name: '' }))).toEqual([]);
  });
});
