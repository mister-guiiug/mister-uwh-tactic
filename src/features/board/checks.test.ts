import { describe, expect, it } from 'vitest';
import { apneaTable } from './apnea.ts';
import { inFieldOfView, maskedBy, stepAlerts } from './checks.ts';
import { createTactic, playerId, refereeId } from './model.ts';

const W1 = playerId('blanc', 1);
const N1 = playerId('noir', 1);
const R1 = refereeId(1);
const R2 = refereeId(2);

function twoSteps() {
  const t = createTactic({ id: 't', name: '', now: '2026-11-20T00:00:00Z' });
  t.steps = [structuredClone(t.steps[0]!), structuredClone(t.steps[0]!)];
  return t;
}

/**
 * Ce que ces tests figent : UNE ALERTE DIT UNE CHOSE VRAIE — un joueur trop
 * rapide pour la durée de l'étape, un palet qu'aucun arbitre ne voit, un
 * corps allongé qui le cache.
 */
describe('les alertes de l’étape', () => {
  it('un champ de vision : devant l’arbitre, à portée', () => {
    const referee = { x: 0, y: 0, angle: 0 };
    expect(inFieldOfView(referee, { x: 5, y: 1 })).toBe(true);
    expect(inFieldOfView(referee, { x: -5, y: 0 })).toBe(false);
    expect(inFieldOfView(referee, { x: 12, y: 0 })).toBe(false);
  });

  it('signale un joueur trop rapide pour rejoindre l’étape à temps', () => {
    const t = twoSteps();
    t.steps[0]!.duration = 2;
    t.steps[0]!.poses[W1] = { x: 5, y: 5, angle: 0, surface: false };
    t.steps[1]!.poses[W1] = { x: 15, y: 5, angle: 0, surface: false };
    const alerts = stepAlerts(t, apneaTable(t), 1);
    expect(alerts.fast.map(f => f.id)).toContain(W1);
    expect(alerts.fast.find(f => f.id === W1)!.speed).toBeCloseTo(5);

    t.display.maxSpeed = 5;
    expect(stepAlerts(t, apneaTable(t), 1).fast).toEqual([]);
  });

  it('ce que voient les arbitres ne compte que champ de vision affiché', () => {
    const t = twoSteps();
    const step = t.steps[0]!;
    step.puck = { x: 12.5, y: 7.5 };
    step.poses[R1] = { x: 2, y: 2, angle: 180 };
    step.poses[R2] = { x: 23, y: 13, angle: 0 };
    expect(stepAlerts(t, apneaTable(t), 0).blind).toBe(false);
    t.display.fieldOfView = true;
    expect(stepAlerts(t, apneaTable(t), 0).blind).toBe(true);

    step.poses[R1] = { x: 12.5, y: 4, angle: 90 };
    expect(stepAlerts(t, apneaTable(t), 0).blind).toBe(false);
  });

  it('un joueur allongé tout près du palet le cache ; loin, non', () => {
    const t = twoSteps();
    const step = t.steps[0]!;
    step.puck = { x: 10, y: 7.5 };
    const referee = { x: 10, y: 3.5 };
    // À 0,3 m du palet, sur la ligne : la vue passe à 0,15 m du fond.
    step.poses[N1] = { x: 10, y: 7.2, angle: 0, surface: false };
    expect(maskedBy(t, step, referee)).toBe(N1);
    // À 2 m du palet, la vue passe à 1 m au-dessus de lui.
    step.poses[N1] = { x: 10, y: 5.5, angle: 0, surface: false };
    expect(maskedBy(t, step, referee)).toBeUndefined();
    // En surface, il ne cache rien du fond.
    step.poses[N1] = { x: 10, y: 7.2, angle: 0, surface: true };
    expect(maskedBy(t, step, referee)).toBeUndefined();
  });
});
