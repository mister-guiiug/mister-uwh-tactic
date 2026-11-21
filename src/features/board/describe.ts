import {
  isSubstitute,
  visiblePlayers,
  type PlayerIdentity,
  type Tactic,
  type Team,
} from './model.ts';

/**
 * LES MOTS D'UNE DESCRIPTION, fournis par l'écran dans sa langue : ce module
 * ne connaît que le schéma. Une phrase par fait — « Blanc 3 descend au fond.
 * Blanc 3 avance de 4 m. » —, plutôt qu'une phrase composée que chaque
 * langue accorderait autrement.
 */
export interface StepWords {
  /** Le nom à dire : le prénom s'il y en a un, sinon « Blanc 3 ». */
  name: (player: PlayerIdentity) => string;
  start: string;
  nobody: string;
  forward: (player: string, metres: number) => string;
  back: (player: string, metres: number) => string;
  side: (player: string, metres: number) => string;
  dives: (player: string) => string;
  surfaces: (player: string) => string;
  pass: (from: string, to: string) => string;
  flick: (from: string, to: string) => string;
  takes: (player: string) => string;
  drops: (player: string) => string;
  has: (player: string) => string;
  others: (count: number) => string;
}

/** Au-delà de ce déplacement, en mètres, un joueur « bouge ». */
const MOVES_FROM = 0.75;
/** Les plus grands déplacements seulement : une consigne, pas un inventaire. */
const MOST = 4;

/**
 * Le sens d'attaque d'une équipe : vers le but adverse, c'est-à-dire loin de
 * la moitié où elle se tient à la première étape. Lu sur le schéma plutôt que
 * fixé : une phase retournée (`mirror`) change les camps.
 */
function attackSign(tactic: Tactic, team: Team): 1 | -1 {
  const first = tactic.steps[0];
  const xs = visiblePlayers(tactic)
    .filter(p => p.team === team && !isSubstitute(p))
    .map(p => first?.poses[p.id]?.x)
    .filter((x): x is number => typeof x === 'number');
  if (xs.length === 0) return team === 'blanc' ? 1 : -1;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return mean < tactic.pitch.length / 2 ? 1 : -1;
}

/**
 * L'ÉTAPE RACONTÉE (ADR 0030) : ce que montre le passage de l'étape d'avant
 * à celle-ci, écrit à partir du schéma lui-même. Une consigne vide se
 * remplit d'un geste, un lecteur d'écran entend la phase autrement que jeton
 * par jeton, et l'impression a un texte sous chaque vignette.
 *
 * - la première étape : la position de départ, et qui a le palet ;
 * - puis, dans l'ordre : le palet (passe, flick, prise, lâcher), les
 *   plongées et remontées, et les plus grands déplacements (au plus quatre,
 *   le reste compté).
 */
export function describeStep(
  tactic: Tactic,
  index: number,
  words: StepWords
): string[] {
  const step = tactic.steps[index];
  if (!step) return [];
  const players = visiblePlayers(tactic).filter(p => !isSubstitute(p));
  const byId = new Map(players.map(p => [p.id, p]));
  const say = (id: string | undefined) => {
    const player = id ? byId.get(id) : undefined;
    return player ? words.name(player) : undefined;
  };

  if (index === 0) {
    const holder = say(step.carrier);
    return [words.start, ...(holder ? [words.has(holder)] : [])];
  }

  const before = tactic.steps[index - 1]!;
  const out: string[] = [];

  // Le palet d'abord : c'est ce que l'œil suit.
  const from = say(before.carrier);
  const to = say(step.carrier);
  if (before.carrier !== step.carrier) {
    const flicked = before.arrows.some(arrow => arrow.kind === 'flick');
    if (from && to) {
      out.push(flicked ? words.flick(from, to) : words.pass(from, to));
    } else if (to) {
      out.push(words.takes(to));
    } else if (from) {
      out.push(words.drops(from));
    }
  }

  const moves: { name: string; metres: number; text: string }[] = [];
  for (const player of players) {
    const a = before.poses[player.id];
    const b = step.poses[player.id];
    if (!a || !b) continue;
    const name = words.name(player);
    if (a.surface && !b.surface) out.push(words.dives(name));
    if (!a.surface && b.surface) out.push(words.surfaces(name));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    if (distance < MOVES_FROM) continue;
    const metres = Math.max(1, Math.round(distance));
    const along = dx * attackSign(tactic, player.team);
    const text =
      Math.abs(dy) > Math.abs(dx)
        ? words.side(name, metres)
        : along > 0
          ? words.forward(name, metres)
          : words.back(name, metres);
    moves.push({ name, metres: distance, text });
  }
  moves.sort((a, b) => b.metres - a.metres);
  out.push(...moves.slice(0, MOST).map(m => m.text));
  if (moves.length > MOST) out.push(words.others(moves.length - MOST));

  return out.length > 0 ? out : [words.nobody];
}
