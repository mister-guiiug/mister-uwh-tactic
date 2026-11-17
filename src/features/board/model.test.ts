import { describe, expect, it } from 'vitest';
import {
  clampFor,
  clampToDeck,
  clampToPitch,
  createTactic,
  DECK_REFEREE_ID,
  DEFAULT_PITCH,
  kickoffStep,
  migrateTactic,
  normalizeAngle,
  playerId,
  POOL_MARGIN,
  PUCK_ID,
  refereeId,
  refereeLineEnds,
  substitutionZone,
  tacticSchema,
  visiblePlayers,
  visibleReferees,
} from './model.ts';
import { tacticV1 } from './fixtures.ts';

const tactic = () =>
  createTactic({ id: 't1', name: 'Essai', now: '2026-11-17T00:00:00Z' });

describe('le modèle du tableau', () => {
  it('un schéma neuf passe son propre schéma de validation', () => {
    expect(() => tacticSchema.parse(tactic())).not.toThrow();
  });

  it('un schéma neuf montre la rencontre : 6 + 4 par équipe, 3 arbitres dans l’eau et 1 au bord', () => {
    const t = tactic();
    expect(visiblePlayers(t)).toHaveLength(20);
    expect(visibleReferees(t).map(r => r.id)).toEqual([
      refereeId(1),
      refereeId(2),
      refereeId(3),
      DECK_REFEREE_ID,
    ]);
    expect(t.pitch.depth).toBe(2);
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
      expect(white.y).toBeCloseTo(black.y);
    }
    expect(step.puck).toEqual({ x: 12.5, y: 7.5 });
  });

  it('les remplaçants attendent dans la zone de leur équipe, hors du terrain', () => {
    const step = kickoffStep(DEFAULT_PITCH);
    for (const team of ['blanc', 'noir'] as const) {
      const zone = substitutionZone(team, DEFAULT_PITCH);
      for (let n = 7; n <= 10; n++) {
        const pose = step.poses[playerId(team, n)]!;
        expect(pose.x).toBeGreaterThanOrEqual(zone.x1);
        expect(pose.x).toBeLessThanOrEqual(zone.x2);
        expect(pose.y).toBeLessThan(0);
        expect(pose.y).toBeGreaterThan(-POOL_MARGIN);
      }
    }
  });

  it('l’arbitre de bord se tient sur la plage, hors de l’eau', () => {
    const pose = kickoffStep(DEFAULT_PITCH).poses[DECK_REFEREE_ID]!;
    expect(pose.y).toBeGreaterThan(DEFAULT_PITCH.width + POOL_MARGIN);
  });

  it('les jetons affichés suivent les effectifs, sans perdre les autres', () => {
    const t = tactic();
    t.counts = {
      blanc: 4,
      noir: 0,
      substitutes: { blanc: 1, noir: 0 },
      referees: 3,
      deckReferee: false,
    };
    expect(visiblePlayers(t).map(p => p.id)).toEqual([
      'blanc-1',
      'blanc-2',
      'blanc-3',
      'blanc-4',
      'blanc-7',
    ]);
    expect(visibleReferees(t)).toHaveLength(3);
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

  it('chaque jeton a son terrain : le palet le terrain, les nageurs le bassin, l’arbitre de bord la plage', () => {
    expect(clampToPitch({ x: -3, y: 40 }, DEFAULT_PITCH)).toEqual({
      x: 0,
      y: 15,
    });
    expect(clampFor(PUCK_ID, { x: -0.5, y: 3 }, DEFAULT_PITCH)).toEqual({
      x: 0,
      y: 3,
    });
    expect(
      clampFor(playerId('blanc', 8), { x: 4, y: -0.5 }, DEFAULT_PITCH)
    ).toEqual({ x: 4, y: -0.5 });
    expect(
      clampFor(playerId('blanc', 1), { x: -5, y: 3 }, DEFAULT_PITCH).x
    ).toBe(-POOL_MARGIN);
  });

  it('un arbitre de bord lâché dans l’eau remonte sur le bord le plus proche', () => {
    expect(clampToDeck({ x: 12, y: 14 }, DEFAULT_PITCH)).toEqual({
      x: 12,
      y: DEFAULT_PITCH.width + POOL_MARGIN + 0.5,
    });
    expect(clampToDeck({ x: 0.2, y: 7 }, DEFAULT_PITCH).x).toBe(
      -POOL_MARGIN - 0.5
    );
    // Sur la plage, il reste où on le pose.
    expect(clampToDeck({ x: 12, y: 17.5 }, DEFAULT_PITCH)).toEqual({
      x: 12,
      y: 17.5,
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

describe('la migration de la version 1', () => {
  it('garde noms, mains, effectifs et poses, et masque ce que la v1 ne connaissait pas', () => {
    const migrated = tacticSchema.parse(migrateTactic(tacticV1()));
    expect(migrated.roster.players).toHaveLength(20);
    expect(migrated.roster.players[0]).toMatchObject({
      name: 'Loïc',
      leftHanded: true,
    });
    expect(migrated.roster.referees[1]!.name).toBe('Chef');
    expect(migrated.counts).toEqual({
      blanc: 6,
      noir: 5,
      referees: 2,
      substitutes: { blanc: 0, noir: 0 },
      deckReferee: false,
    });
    // Le schéma s'affiche exactement comme avant.
    expect(visiblePlayers(migrated)).toHaveLength(11);
    expect(visibleReferees(migrated)).toHaveLength(2);
    expect(migrated.pitch.depth).toBe(2.5);
    expect(migrated.steps[0]!.poses[playerId('noir', 9)]).toBeDefined();
    expect(migrated.steps[0]!.poses[DECK_REFEREE_ID]).toBeDefined();
  });

  it('laisse passer ce qui n’est pas une v1, et le schéma tranche', () => {
    const v2 = tactic();
    expect(migrateTactic(v2)).toBe(v2);
    expect(migrateTactic(null)).toBeNull();
  });
});
