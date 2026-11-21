import { stickTip } from '../carry.ts';
import {
  distance,
  visiblePlayers,
  type PlayerIdentity,
  type Point,
  type Pose,
  type Step,
  type Tactic,
} from '../model.ts';

/**
 * « À TOI DE JOUER » (ADR 0022) : un joueur rejoue une phase, étape par
 * étape, en plaçant son seul jeton ; tout le reste est déjà à sa place.
 *
 * TOUT CE QUI SUIT REND DES COPIES. Le jeu dessine un schéma dérivé du
 * brouillon, jamais le brouillon lui-même : le magasin du tableau
 * l'enregistrerait (`draftStore`), et le schéma de l'entraîneur serait
 * écrasé par une partie.
 */

/**
 * Un joueur « bouge » d'une étape à l'autre au-delà de ce seuil : celui qui
 * fait paraître le fantôme au tableau (`Board2D.tsx`).
 */
export const MOVED = 0.3;

/**
 * LES SEUILS DU VERDICT, en mètres entre la place choisie et la bonne.
 *
 * - **Juste**, à moins d'un mètre : le palet se joue à 1,25 m de la
 *   poitrine (`CARRY.ahead`), la crosse couvre donc la bonne place ; au
 *   tableau, les deux pions se recouvrent (un joueur se touche à 1,15 m).
 * - **Presque**, à moins de deux mètres : moins d'une longueur de nageur,
 *   palmes comprises (2,4 m du masque au bout des palmes dans le dessin du
 *   tableau, `equipment.ts`). Deux coups de palmes rattrapent l'écart.
 * - **À revoir**, au-delà : on nage dans le couloir d'un autre. À
 *   l'engagement, deux joueurs voisins sont à 1,6 m l'un de l'autre.
 */
export const VERDICT_LIMITS = { right: 1, close: 2 } as const;

export type Verdict = 'right' | 'close' | 'off';

export function verdictOf(gap: number): Verdict {
  if (gap <= VERDICT_LIMITS.right) return 'right';
  if (gap <= VERDICT_LIMITS.close) return 'close';
  return 'off';
}

/**
 * Une flèche part du joueur, ou y arrive, quand l'un de ses bouts est à
 * moins de ce rayon de sa place, avant ou après l'étape : le palet qu'il
 * porte est à 1,26 m de sa poitrine (`carry.ts`), et une passe part de là.
 */
export const HINT_RADIUS = 1.5;

/** La pose d'un joueur à une étape. */
export function poseAt(tactic: Tactic, step: number, id: string): Pose {
  const pose = tactic.steps[step]?.poses[id];
  if (!pose) throw new Error(`pose introuvable : ${id} à l'étape ${step}`);
  return pose;
}

/** Les joueurs affichés qui bougent au moins une fois pendant la phase. */
export function movingPlayers(tactic: Tactic): PlayerIdentity[] {
  return visiblePlayers(tactic).filter(player =>
    tactic.steps.some((step, i) => {
      if (i === 0) return false;
      const before = tactic.steps[i - 1]!.poses[player.id];
      const now = step.poses[player.id];
      return !!before && !!now && distance(before, now) > MOVED;
    })
  );
}

/** Une étape seule, dans un schéma qui n'a qu'elle : l'image que `Board2D` dessine. */
function alone(tactic: Tactic, step: Step): Tactic {
  return {
    ...tactic,
    // Le fantôme montrerait d'où chacun vient — et, pour lui, où il va.
    display: { ...tactic.display, ghosts: false },
    steps: [step],
  };
}

/**
 * L'ÉTAPE À DEVINER, SANS RÉPONSE SOUFFLÉE : tous à leur place de l'étape
 * `step`, sauf le joueur choisi, posé là où on l'a mis (`guess`) avec la
 * profondeur et l'orientation qu'il avait à l'étape d'avant.
 *
 * Retirés de la copie :
 * - les flèches qui partent de lui ou y arrivent, avant comme après ;
 * - le fantôme ;
 * - le palet à sa place de l'étape, s'il le porte : il le garde au bout de
 *   SA crosse, là où on le pose — sinon le palet dirait où il va.
 */
export function guessTactic(
  tactic: Tactic,
  step: number,
  id: string,
  guess: Point
): Tactic {
  const shown = tactic.steps[step];
  if (!shown || step < 1) throw new Error(`étape à deviner invalide : ${step}`);
  const start = poseAt(tactic, step - 1, id);
  const target = poseAt(tactic, step, id);
  const near = (point: Point) =>
    distance(point, start) < HINT_RADIUS ||
    distance(point, target) < HINT_RADIUS;
  const placed: Pose = { ...start, x: guess.x, y: guess.y };
  const identity = tactic.roster.players.find(p => p.id === id);
  return alone(tactic, {
    ...shown,
    poses: { ...shown.poses, [id]: placed },
    arrows: shown.arrows.filter(a => !near(a.from) && !near(a.to)),
    puck:
      shown.carrier === id
        ? stickTip(placed, identity?.leftHanded ?? false)
        : shown.puck,
  });
}

/** La bonne réponse : l'étape telle que l'entraîneur l'a dessinée, flèches comprises. */
export function revealTactic(tactic: Tactic, step: number): Tactic {
  const shown = tactic.steps[step];
  if (!shown) throw new Error(`étape invalide : ${step}`);
  return alone(tactic, shown);
}

export interface RoundResult {
  /** L'étape devinée, comptée depuis 0. */
  step: number;
  /** L'écart à la bonne place, en mètres. */
  gap: number;
  verdict: Verdict;
}

/**
 * OÙ EN EST LA PARTIE : le choix du joueur, une étape à deviner (vérifiée ou
 * non), ou le bilan.
 */
export type LearnStage =
  | { kind: 'choose' }
  | {
      kind: 'round';
      player: string;
      step: number;
      guess: Point;
      checked: RoundResult | null;
      results: RoundResult[];
    }
  | { kind: 'summary'; player: string; results: RoundResult[] };

type Round = Extract<LearnStage, { kind: 'round' }>;

/** La partie commence à la deuxième étape, le joueur à sa place de la première. */
export function startRound(tactic: Tactic, player: string): LearnStage {
  return roundAt(tactic, player, 1, []);
}

function roundAt(
  tactic: Tactic,
  player: string,
  step: number,
  results: RoundResult[]
): Round {
  const { x, y } = poseAt(tactic, step - 1, player);
  return {
    kind: 'round',
    player,
    step,
    guess: { x, y },
    checked: null,
    results,
  };
}

/** « Vérifier » : l'écart, et son verdict. */
export function checkRound(tactic: Tactic, stage: LearnStage): LearnStage {
  if (stage.kind !== 'round' || stage.checked) return stage;
  const gap = distance(stage.guess, poseAt(tactic, stage.step, stage.player));
  const checked = { step: stage.step, gap, verdict: verdictOf(gap) };
  return { ...stage, checked, results: [...stage.results, checked] };
}

/**
 * L'étape suivante, le joueur parti de sa VRAIE place — pas de celle qu'on
 * lui avait donnée — ou, après la dernière, le bilan.
 */
export function nextStage(tactic: Tactic, stage: LearnStage): LearnStage {
  if (stage.kind !== 'round' || !stage.checked) return stage;
  if (stage.step + 1 >= tactic.steps.length) {
    return { kind: 'summary', player: stage.player, results: stage.results };
  }
  return roundAt(tactic, stage.player, stage.step + 1, stage.results);
}

export interface Summary {
  /** Les étapes jouées. */
  steps: number;
  /** Celles qui sont justes. */
  right: number;
  /** L'écart moyen, en mètres ; 0 sans étape. */
  meanGap: number;
}

export function summarize(results: RoundResult[]): Summary {
  const right = results.filter(r => r.verdict === 'right').length;
  const total = results.reduce((sum, r) => sum + r.gap, 0);
  return {
    steps: results.length,
    right,
    meanGap: results.length ? total / results.length : 0,
  };
}
