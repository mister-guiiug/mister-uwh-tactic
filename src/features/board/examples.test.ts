import { describe, expect, it } from 'vitest';
import { exampleTactic } from './examples.ts';
import { playerId, tacticSchema } from './model.ts';

const texts = {
  name: 'Exemple',
  notes: ['un', 'deux', 'trois'] as [string, string, string],
};

describe('exampleTactic', () => {
  const tactic = exampleTactic(texts, { id: 'exemple' });

  it('rend un schéma valide, de trois étapes et leurs consignes', () => {
    expect(() => tacticSchema.parse(tactic)).not.toThrow();
    expect(tactic.name).toBe('Exemple');
    expect(tactic.steps.map(s => s.note)).toEqual(['un', 'deux', 'trois']);
  });

  it('fait plonger trois Blancs à la deuxième étape, flèches à l’appui', () => {
    const step = tactic.steps[1]!;
    for (const n of [1, 2, 3]) {
      expect(step.poses[playerId('blanc', n)]!.surface).toBe(false);
    }
    expect(step.arrows.filter(a => a.kind === 'move')).toHaveLength(3);
  });

  it('finit sur une passe', () => {
    expect(tactic.steps[2]!.arrows.map(a => a.kind)).toEqual(['pass']);
  });
});
