import { describe, expect, it } from 'vitest';
import { buildExample, EXAMPLE_IDS, exampleTactic } from './examples.ts';
import { GOAL_TRAY } from './pitch.ts';
import { apneaTable, overLimit } from './apnea.ts';
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

describe('les exemples tirés des documents de formation', () => {
  const story = (n: number) => ({
    name: 'Phase',
    notes: Array.from({ length: n }, (_, i) => `consigne ${i + 1}`),
  });
  const STEPS = {
    neutral: 3,
    kickoff: 3,
    faceOff: 3,
    rightAttack: 3,
    wingSwitch: 5,
    wallPlay: 4,
    slide: 3,
    penalty: 4,
  };

  it.each(EXAMPLE_IDS)('%s : un schéma valide, une consigne par étape', id => {
    const tactic = buildExample(id, story(STEPS[id]), { id: `ex-${id}` });
    expect(() => tacticSchema.parse(tactic)).not.toThrow();
    expect(tactic.steps).toHaveLength(STEPS[id]);
    expect(tactic.steps.map(s => s.note)).toEqual(story(STEPS[id]).notes);
  });

  it('l’engagement nomme les Blancs comme les clubs, et les aligne au mur', () => {
    const tactic = buildExample('kickoff', story(3), { id: 'ex' });
    const names = Object.fromEntries(
      tactic.roster.players
        .filter(p => p.team === 'blanc' && p.number <= 6)
        .map(p => [p.id, p.name])
    );
    expect(Object.values(names).sort()).toEqual(
      ['AC', 'AD', 'AG', 'AR', 'PD', 'PG'].sort()
    );
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(tactic.steps[0]!.poses[playerId('blanc', n)]!.x).toBeCloseTo(0.6);
    }
  });

  it('la pénalité finit dans la cuvette du but des Blancs', () => {
    const tactic = buildExample('penalty', story(4), { id: 'ex' });
    const puck = tactic.steps.at(-1)!.puck;
    expect(puck.x).toBeLessThan(GOAL_TRAY.trough);
    expect(Math.abs(puck.y - tactic.pitch.width / 2)).toBeLessThan(
      GOAL_TRAY.width / 2
    );
  });
});

describe('les exemples respectent l’apnée', () => {
  it.each(EXAMPLE_IDS)('%s : aucun joueur au-delà du seuil', id => {
    const tactic = buildExample(
      id,
      { name: 'Phase', notes: ['a', 'b', 'c', 'd', 'e'] },
      { id: `ap-${id}` }
    );
    const table = apneaTable(tactic);
    tactic.steps.forEach((_, i) => {
      expect([...overLimit(table, i)]).toEqual([]);
    });
  });
});
