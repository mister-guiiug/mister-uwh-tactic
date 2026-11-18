import {
  isSubstitute,
  visiblePlayers,
  type PlayerIdentity,
  type Tactic,
  type Team,
} from './model.ts';

/**
 * L'APNÉE, ÉTAPE PAR ÉTAPE. Au hockey subaquatique, la tactique se joue
 * autant dans la profondeur que sur le terrain : qui est au fond, qui
 * respire, et depuis combien de temps. Une phase qui laisse un joueur vingt
 * secondes au fond est une phase qui ne marchera pas.
 *
 * Chaque étape a une DURÉE en jeu réel. Pour chaque joueur dans l'eau, on
 * cumule les secondes passées au fond d'affilée ; une remontée remet le
 * compteur à zéro. Au-delà du seuil (`display.apneaLimit`), le joueur est
 * signalé. Les remplaçants, hors du jeu, ne comptent pas.
 */
export interface ApneaCell {
  /** En surface à cette étape. */
  surface: boolean;
  /** Secondes de fond d'affilée à la FIN de cette étape. */
  seconds: number;
  /** Au-delà du seuil. */
  over: boolean;
}

export interface ApneaTable {
  players: PlayerIdentity[];
  cells: Record<string, ApneaCell[]>;
  /** Combien de joueurs de chaque équipe sont au fond, à chaque étape. */
  bottom: Record<Team, number>[];
}

export function apneaTable(tactic: Tactic): ApneaTable {
  const players = visiblePlayers(tactic).filter(p => !isSubstitute(p));
  const limit = tactic.display.apneaLimit;
  const cells: Record<string, ApneaCell[]> = {};
  for (const player of players) {
    let seconds = 0;
    cells[player.id] = tactic.steps.map(step => {
      const surface = step.poses[player.id]?.surface !== false;
      seconds = surface ? 0 : seconds + step.duration;
      return { surface, seconds, over: seconds > limit };
    });
  }
  const bottom = tactic.steps.map((_, index) => {
    const count: Record<Team, number> = { blanc: 0, noir: 0 };
    for (const player of players) {
      if (!cells[player.id]![index]!.surface) count[player.team] += 1;
    }
    return count;
  });
  return { players, cells, bottom };
}

/** Les joueurs au-delà du seuil à une étape. */
export function overLimit(table: ApneaTable, step: number): Set<string> {
  const over = new Set<string>();
  for (const player of table.players) {
    if (table.cells[player.id]![step]?.over) over.add(player.id);
  }
  return over;
}
