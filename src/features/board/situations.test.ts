import { describe, expect, it } from 'vitest';
import { restartSpot, situationStep } from './situations.ts';
import { DEFAULT_PITCH, kickoffStep, playerId, refereeId } from './model.ts';

const base = () => {
  const step = kickoffStep(DEFAULT_PITCH);
  step.note = 'consigne';
  step.duration = 8;
  return step;
};

describe('les situations du règlement', () => {
  it('un palet se remet en jeu à 2 m des bords et 5 m des lignes de but, au plus près', () => {
    expect(restartSpot({ x: 1, y: 0.5 }, DEFAULT_PITCH)).toEqual({
      x: 5,
      y: 2,
    });
    expect(restartSpot({ x: 24, y: 14 }, DEFAULT_PITCH)).toEqual({
      x: 20,
      y: 13,
    });
    expect(restartSpot({ x: 10, y: 6 }, DEFAULT_PITCH)).toEqual({
      x: 10,
      y: 6,
    });
  });

  it('palet neutre : chaque équipe en surface, de son côté de la ligne du palet', () => {
    const current = base();
    current.puck = { x: 9, y: 4 };
    const step = situationStep('equal', current, DEFAULT_PITCH);
    expect(step.puck).toEqual({ x: 9, y: 4 });
    for (let n = 1; n <= 6; n++) {
      const white = step.poses[playerId('blanc', n)]!;
      const black = step.poses[playerId('noir', n)]!;
      expect(white.x).toBeLessThan(9);
      expect(black.x).toBeGreaterThan(9);
      expect(white.surface).toBe(true);
      expect(black.surface).toBe(true);
    }
    expect(step.poses[refereeId(1)]!.x).toBe(9);
    expect(step.note).toBe('consigne');
    expect(step.duration).toBe(8);
  });

  it('palet d’avantage : l’équipe fautive à 3 m au moins, vers son but', () => {
    const current = base();
    current.puck = { x: 12, y: 7 };
    const step = situationStep('advantage-blanc', current, DEFAULT_PITCH);
    for (let n = 1; n <= 6; n++) {
      // Les Noirs sont fautifs : leur but est en x = 25.
      expect(step.poses[playerId('noir', n)]!.x).toBeGreaterThanOrEqual(15);
    }
    // Un Blanc se tient au palet.
    const closest = Math.min(
      ...[1, 2, 3, 4, 5, 6].map(n =>
        Math.hypot(
          step.poses[playerId('blanc', n)]!.x - 12,
          step.poses[playerId('blanc', n)]!.y - 7
        )
      )
    );
    expect(closest).toBeLessThan(1);
  });

  it('tir de pénalité : palet au point, deux attaquants, un défenseur au mur, les autres sur le banc', () => {
    const step = situationStep('penalty-blanc', base(), DEFAULT_PITCH);
    expect(step.puck).toEqual({ x: 3, y: 7.5 });
    const attackers = [1, 2].map(n => step.poses[playerId('noir', n)]!);
    for (const a of attackers) {
      // Derrière le palet, vu du but des Blancs, et en surface.
      expect(a.x).toBeGreaterThan(3);
      expect(a.surface).toBe(true);
    }
    const defender = step.poses[playerId('blanc', 1)]!;
    expect(defender.x).toBeLessThan(1);
    expect(defender.y).toBe(7.5);
    // Tous les autres dans leur zone de remplacement, hors du terrain.
    for (let n = 2; n <= 10; n++) {
      expect(step.poses[playerId('blanc', n)]!.y).toBeLessThan(0);
    }
    for (let n = 3; n <= 10; n++) {
      expect(step.poses[playerId('noir', n)]!.y).toBeLessThan(0);
    }
    // Deux arbitres au bout des arcs de 6 m, près de la ligne de but.
    expect(step.poses[refereeId(1)]).toMatchObject({ y: 1.5 });
    expect(step.poses[refereeId(2)]).toMatchObject({ y: 13.5 });
    expect(step.arrows).toEqual([]);
  });

  it('engagement : la place réglementaire de départ', () => {
    const step = situationStep('kickoff', base(), DEFAULT_PITCH);
    expect(step.poses[playerId('blanc', 1)]!.x).toBeLessThan(1);
    expect(step.poses[refereeId(1)]).toMatchObject({ x: 5, y: 2 });
    expect(step.note).toBe('consigne');
  });
});
