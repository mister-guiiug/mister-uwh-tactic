import {
  clamp,
  DECK_REFEREE_ID,
  INNER_RECT,
  kickoffStep,
  MAX_PLAYERS,
  playerId,
  refereeId,
  SQUAD_SIZE,
  substitutionZone,
  type Pitch,
  type Point,
  type Pose,
  type Step,
  type Team,
} from './model.ts';

/**
 * LES SITUATIONS DU RÈGLEMENT, placées en un geste (CMAS, 12ᵉ édition).
 *
 * - ENGAGEMENT (15.1) : chaque équipe contre son mur, les officiels à leur
 *   place de départ.
 * - PALET NEUTRE (17.5) : le palet là où la faute a eu lieu, jamais à moins
 *   de 2 m d'un bord ni de 5 m d'une ligne de but ; les deux équipes EN
 *   SURFACE, chacune de son côté de la ligne qui passe par le palet ; deux
 *   arbitres forment cette ligne.
 * - PALET D'AVANTAGE (17.6) : même placement du palet ; l'équipe fautive
 *   recule derrière une ligne à 3 m du palet, vers son but ; l'équipe
 *   lesee se place où elle veut.
 * - TIR DE PÉNALITÉ (17.8) : le palet sur le point de pénalité de l'équipe
 *   fautive ; deux attaquants EN SURFACE derrière le palet ; un défenseur en
 *   surface au milieu du mur, une main dessus ; tous les autres dans leur
 *   zone de remplacement ; deux arbitres au bout des arcs de 6 m, le
 *   troisième derrière les attaquants.
 *
 * Le placement exact des joueurs libres (qui va où, à quelle distance) n'est
 * pas réglé par le texte : c'est un point de départ que l'entraîneur ajuste.
 */
export const SITUATIONS = [
  'kickoff',
  'equal',
  'advantage-blanc',
  'advantage-noir',
  'penalty-blanc',
  'penalty-noir',
] as const;
export type Situation = (typeof SITUATIONS)[number];

const other = (team: Team): Team => (team === 'blanc' ? 'noir' : 'blanc');

/** Le palet ramené dans la zone de remise en jeu (17.5.1.2.1, 17.6.2.1). */
export function restartSpot(point: Point, pitch: Pitch): Point {
  return {
    x: clamp(point.x, INNER_RECT.ends, pitch.length - INNER_RECT.ends),
    y: clamp(point.y, INNER_RECT.sides, pitch.width - INNER_RECT.sides),
  };
}

/** `distance` mètres de la ligne de but de `team`, vers le terrain. */
const fromGoal = (team: Team, distance: number, pitch: Pitch) =>
  team === 'blanc' ? distance : pitch.length - distance;
/** L'angle qui regarde le but adverse. */
const attacking = (team: Team) => (team === 'blanc' ? 0 : 180);

/** Des places réparties en travers, de `count` joueurs, à l'abscisse `x`. */
function across(count: number, x: number, pitch: Pitch): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x,
    y: (pitch.width * (i + 1)) / (count + 1),
  }));
}

/** Range des joueurs dans la zone de remplacement de leur équipe. */
function toBench(
  ids: string[],
  team: Team,
  pitch: Pitch,
  poses: Record<string, Pose>
) {
  const zone = substitutionZone(team, pitch);
  const span = zone.x2 - zone.x1;
  ids.forEach((id, i) => {
    const t = ids.length === 1 ? 0.5 : i / (ids.length - 1);
    poses[id] = {
      x: zone.x1 + 0.4 + t * (span - 0.8),
      // Deux rangs, pour que neuf nageurs y tiennent sans se chevaucher.
      y: i % 2 === 0 ? -0.3 : -0.75,
      angle: 90,
      surface: true,
    };
  });
}

/**
 * Les deux équipes en surface de part et d'autre d'une ligne : trois devant
 * à `gap` mètres, trois derrière à `gap + 4`.
 */
function lineUp(
  team: Team,
  lineX: number,
  gap: number,
  pitch: Pitch,
  poses: Record<string, Pose>
) {
  const sign = team === 'blanc' ? -1 : 1;
  const front = across(3, lineX + sign * gap, pitch);
  const back = across(3, lineX + sign * (gap + 4), pitch);
  [...front, ...back].forEach((point, i) => {
    poses[playerId(team, i + 1)] = {
      x: clamp(point.x, 0.4, pitch.length - 0.4),
      y: point.y,
      angle: attacking(team),
      surface: true,
    };
  });
}

/** Deux arbitres aquatiques sur une ligne en travers, de chaque côté. */
function refereesOnLine(x: number, pitch: Pitch, poses: Record<string, Pose>) {
  poses[refereeId(1)] = { x, y: 0.8, angle: 90 };
  poses[refereeId(2)] = { x, y: pitch.width - 0.8, angle: 270 };
}

/** L'étape `current` replacée selon `situation` (note et durée gardées). */
export function situationStep(
  situation: Situation,
  current: Step,
  pitch: Pitch
): Step {
  const kickoff = kickoffStep(pitch);
  const keep = { note: current.note, duration: current.duration, arrows: [] };
  if (situation === 'kickoff') return { ...kickoff, ...keep };

  const poses: Record<string, Pose> = { ...current.poses };
  const puck = restartSpot(current.puck, pitch);
  // L'arbitre de bord reste au milieu du côté, comme au départ.
  poses[DECK_REFEREE_ID] = kickoff.poses[DECK_REFEREE_ID]!;

  if (situation === 'equal') {
    lineUp('blanc', puck.x, 1, pitch, poses);
    lineUp('noir', puck.x, 1, pitch, poses);
    refereesOnLine(puck.x, pitch, poses);
    return { ...keep, poses, puck };
  }

  if (situation === 'advantage-blanc' || situation === 'advantage-noir') {
    const lesee: Team = situation === 'advantage-blanc' ? 'blanc' : 'noir';
    const fautive = other(lesee);
    // L'équipe fautive derrière la ligne des 3 m, vers son but.
    const sign = fautive === 'blanc' ? -1 : 1;
    const line = puck.x + sign * 3;
    lineUp(fautive, line, 0.5, pitch, poses);
    // L'équipe lesee : un joueur au palet, les autres en soutien derrière.
    const back = -sign;
    const support: Point[] = [
      { x: puck.x + back * 0.8, y: puck.y },
      { x: puck.x + back * 2.5, y: clamp(puck.y - 3, 1, pitch.width - 1) },
      { x: puck.x + back * 2.5, y: clamp(puck.y + 3, 1, pitch.width - 1) },
      ...across(3, puck.x + back * 5.5, pitch),
    ];
    support.forEach((point, i) => {
      poses[playerId(lesee, i + 1)] = {
        x: clamp(point.x, 0.4, pitch.length - 0.4),
        y: point.y,
        angle: attacking(lesee),
        surface: true,
      };
    });
    refereesOnLine(line, pitch, poses);
    return { ...keep, poses, puck };
  }

  // Tir de pénalité contre l'équipe `fautive`.
  const fautive: Team = situation === 'penalty-blanc' ? 'blanc' : 'noir';
  const lesee = other(fautive);
  const spot = { x: fromGoal(fautive, 3, pitch), y: pitch.width / 2 };
  const behind = fromGoal(fautive, 4.3, pitch);
  poses[playerId(lesee, 1)] = {
    x: behind,
    y: spot.y - 0.8,
    angle: attacking(lesee),
    surface: true,
  };
  poses[playerId(lesee, 2)] = {
    x: behind,
    y: spot.y + 0.8,
    angle: attacking(lesee),
    surface: true,
  };
  poses[playerId(fautive, 1)] = {
    x: fromGoal(fautive, 0.4, pitch),
    y: spot.y,
    angle: attacking(fautive),
    surface: true,
  };
  const bench = (team: Team, from: number) => {
    const ids: string[] = [];
    for (let n = from; n <= SQUAD_SIZE; n++) ids.push(playerId(team, n));
    return ids;
  };
  toBench(bench(lesee, 3), lesee, pitch, poses);
  toBench(bench(fautive, 2), fautive, pitch, poses);
  const end = fromGoal(fautive, 0.8, pitch);
  const facing = attacking(lesee);
  poses[refereeId(1)] = { x: end, y: spot.y - 6, angle: facing };
  poses[refereeId(2)] = { x: end, y: spot.y + 6, angle: facing };
  poses[refereeId(3)] = {
    x: fromGoal(fautive, 7.5, pitch),
    y: spot.y,
    angle: attacking(lesee),
  };
  return { ...keep, poses, puck: spot };
}

/** Pour les tests : les joueurs de champ d'une équipe. */
export const fieldIds = (team: Team) =>
  Array.from({ length: MAX_PLAYERS }, (_, i) => playerId(team, i + 1));
