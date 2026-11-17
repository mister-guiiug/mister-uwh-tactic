import { describe, expect, it } from 'vitest';
import {
  clampToPitch,
  createTactic,
  DEFAULT_PITCH,
  kickoffStep,
  normalizeAngle,
  playerId,
  refereeId,
  refereeLineEnds,
  tacticSchema,
  visiblePlayers,
  visibleReferees,
} from './model.ts';

const tactic = () =>
  createTactic({ id: 't1', name: 'Essai', now: '2026-11-17T00:00:00Z' });

describe('le modèle du tableau', () => {
  it('un schéma neuf passe son propre schéma de validation', () => {
    expect(() => tacticSchema.parse(tactic())).not.toThrow();
  });

  it('l’engagement place chaque équipe contre son mur, tête vers l’adversaire', () => {
    const step = kickoffStep(DEFAULT_PITCH);
    for (let n = 1; n <= 6; n++) {
      const white = step.poses[playerId('blanc', n)]!;
      const black = step.poses[playerId('noir', n)]!;
      expect(white.x).toBeLessThan(1);
      expect(black.x).toBeGreaterThan(DEFAULT_PITCH.length - 1);
      expect(white.angle).toBe(0);
      expect(black.angle).toBe(180);
      // Face à face : même travers pour le même numéro.
      expect(white.y).toBeCloseTo(black.y);
    }
    expect(step.puck).toEqual({ x: 12.5, y: 7.5 });
  });

  it('les jetons affichés suivent les effectifs, sans perdre les autres', () => {
    const t = tactic();
    t.counts = { blanc: 4, noir: 0, referees: 3 };
    expect(visiblePlayers(t).map(p => p.id)).toEqual([
      'blanc-1',
      'blanc-2',
      'blanc-3',
      'blanc-4',
    ]);
    expect(visibleReferees(t)).toHaveLength(3);
    // Les poses des joueurs masqués restent dans l'étape.
    expect(t.steps[0]!.poses[playerId('noir', 6)]).toBeDefined();
  });

  it('la ligne entre arbitres disparaît si l’un des deux est masqué', () => {
    const t = tactic();
    t.display.refereeLine = '1-3';
    t.counts.referees = 2;
    expect(refereeLineEnds(t)).toBeNull();
    t.counts.referees = 3;
    expect(refereeLineEnds(t)).toEqual([refereeId(1), refereeId(3)]);
  });

  it('un point sorti du terrain y est ramené', () => {
    expect(clampToPitch({ x: -3, y: 40 }, DEFAULT_PITCH)).toEqual({
      x: 0,
      y: 15,
    });
  });

  it('un angle est ramené dans [0, 360)', () => {
    expect(normalizeAngle(-15)).toBe(345);
    expect(normalizeAngle(720)).toBe(0);
  });

  it('refuse un bassin hors règlement', () => {
    const t = tactic();
    t.pitch.depth = 5;
    expect(tacticSchema.safeParse(t).success).toBe(false);
  });
});
