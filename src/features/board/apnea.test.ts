import { describe, expect, it } from 'vitest';
import { apneaTable, overLimit } from './apnea.ts';
import { createTactic, playerId } from './model.ts';

function phase() {
  const t = createTactic({ id: 't', name: '', now: '2026-11-18T00:00:00Z' });
  t.display.apneaLimit = 15;
  const w1 = playerId('blanc', 1);
  const make = (surface: boolean, duration: number) => {
    const step = structuredClone(t.steps[0]!);
    step.poses[w1] = { ...step.poses[w1]!, surface };
    step.duration = duration;
    return step;
  };
  t.steps = [
    make(false, 6),
    make(false, 6),
    make(false, 6),
    make(true, 9),
    make(false, 5),
  ];
  return { t, w1, make };
}

describe('l’apnée', () => {
  it('cumule les secondes de fond d’affilée, et une vraie récupération remet à zéro', () => {
    const { t, w1 } = phase();
    const cells = apneaTable(t).cells[w1]!;
    // 18 s au fond, 9 s en surface (la moitié) : récupéré.
    expect(cells.map(c => c.seconds)).toEqual([6, 12, 18, 0, 5]);
    expect(cells.map(c => c.over)).toEqual([false, false, true, false, false]);
  });

  it('remonter une seconde pour replonger ne récupère pas', () => {
    const { t, w1, make } = phase();
    t.steps[3] = make(true, 2);
    const cells = apneaTable(t).cells[w1]!;
    expect(cells.map(c => c.seconds)).toEqual([6, 12, 18, 18, 23]);
    expect(cells[3]!.recovering).toBe(true);
    expect(cells[4]!.over).toBe(true);
  });

  it('chaque joueur peut avoir son apnée', () => {
    const { t, w1 } = phase();
    t.roster.players.find(p => p.id === w1)!.apnea = 20;
    const cells = apneaTable(t).cells[w1]!;
    expect(cells.map(c => c.over)).toEqual([false, false, false, false, false]);
  });

  it('ne compte que les joueurs dans l’eau, pas les remplaçants', () => {
    const { t } = phase();
    const table = apneaTable(t);
    expect(table.players).toHaveLength(12);
    expect(table.players.some(p => p.number > 6)).toBe(false);
  });

  it('compte, par équipe, qui est au fond à chaque étape', () => {
    const { t } = phase();
    const table = apneaTable(t);
    expect(table.bottom[0]).toEqual({ blanc: 1, noir: 0 });
    expect(table.bottom[3]).toEqual({ blanc: 0, noir: 0 });
  });

  it('signale ceux qui dépassent le seuil à une étape', () => {
    const { t, w1 } = phase();
    expect([...overLimit(apneaTable(t), 2)]).toEqual([w1]);
    expect(overLimit(apneaTable(t), 1).size).toBe(0);
  });
});
