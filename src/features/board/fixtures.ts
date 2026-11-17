import { createTactic, MAX_PLAYERS } from './model.ts';

/**
 * UN SCHÉMA DE LA VERSION 1, tel que l'écrivait l'application avant les
 * remplaçants et l'arbitre de bord — pour les tests de migration. Fabriqué à
 * partir d'un schéma neuf, amputé de ce que la version 1 ne connaissait pas.
 */
export function tacticV1(): Record<string, unknown> {
  const t = createTactic({
    id: 'ancien',
    name: 'Schéma de la v1',
    now: '2026-11-17T00:00:00Z',
  });
  const keep = (id: string) => {
    const [kind, n] = id.split('-');
    if (kind === 'arbitre') return Number(n) <= 3;
    return Number(n) <= MAX_PLAYERS;
  };
  const players = t.roster.players.filter(p => p.number <= MAX_PLAYERS);
  players[0]!.name = 'Loïc';
  players[0]!.leftHanded = true;
  const referees = t.roster.referees.filter(r => r.number <= 3);
  referees[1]!.name = 'Chef';
  return {
    ...t,
    pitch: { length: 25, width: 15, depth: 2.5 },
    roster: { players, referees },
    counts: { blanc: 6, noir: 5, referees: 2 },
    steps: t.steps.map(step => ({
      ...step,
      poses: Object.fromEntries(
        Object.entries(step.poses).filter(([id]) => keep(id))
      ),
    })),
  };
}
