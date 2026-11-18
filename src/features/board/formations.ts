import {
  MAX_PLAYERS,
  playerId,
  type Pitch,
  type Pose,
  type Team,
} from './model.ts';

/**
 * LES COMPOSITIONS, lues D'AVANT EN ARRIÈRE : « 3-2-1 », ce sont trois joueurs
 * devant, près de la ligne médiane, deux au milieu, un en arrière devant son
 * but. Les six que montre la présentation du sport par UWH News (« This is
 * underwater hockey ! », 2020) : 3-2-1, 1-2-1-2, 2-2-2, 2-3-1, 2-1-3, 1-2-3.
 *
 * Une composition place les six joueurs dans l'eau de l'équipe, dans sa
 * moitié, tête vers le but adverse ; leur profondeur ne change pas.
 */
export const FORMATIONS = [
  '3-2-1',
  '2-3-1',
  '2-2-2',
  '1-2-1-2',
  '2-1-3',
  '1-2-3',
  // Relevées dans les manuels de club (18/11/2026) : la 1-2-2-1 du guide
  // de Tasmanie (pointe, deux ailiers, deux demis, un arrière), la 2-1-2-1
  // du manuel de Wellington (deux ailiers, un milieu, deux arrières, un
  // dernier lien derrière eux).
  '1-2-2-1',
  '2-1-2-1',
] as const;
export type Formation = (typeof FORMATIONS)[number];

export type LineRole = 'front' | 'middle' | 'back';
export type SideRole = 'left' | 'centre' | 'right' | null;

export interface FormationSlot {
  id: string;
  pose: Pose;
  line: LineRole;
  side: SideRole;
}

/** Les effectifs par ligne, d'avant en arrière. */
export const formationLines = (formation: Formation): number[] =>
  formation.split('-').map(Number);

/** La ligne arrière se tient juste hors de la zone de but de 3 m. */
const BACK_LINE = 4;
/** La ligne avant s'arrête à un mètre et demi de la ligne médiane. */
const FRONT_GAP = 1.5;

function sides(count: number): SideRole[] {
  if (count === 1) return [null];
  if (count === 2) return ['left', 'right'];
  if (count === 3) return ['left', 'centre', 'right'];
  return Array.from({ length: count }, () => null);
}

/**
 * Les six places, numérotées d'avant en arrière, de gauche à droite VUE DU
 * JOUEUR : pour les Blancs, qui attaquent vers les `x` croissants, la gauche
 * est du côté des `y` faibles ; pour les Noirs, c'est l'inverse.
 */
export function formationSlots(
  formation: Formation,
  team: Team,
  pitch: Pitch,
  surfaceOf: (id: string) => boolean | undefined = () => undefined
): FormationSlot[] {
  const lines = formationLines(formation);
  const front = pitch.length / 2 - FRONT_GAP;
  const step = lines.length > 1 ? (front - BACK_LINE) / (lines.length - 1) : 0;
  const slots: FormationSlot[] = [];
  let number = 1;
  lines.forEach((count, lineIndex) => {
    // Distance au but de l'équipe : la ligne avant d'abord.
    const depth = front - lineIndex * step;
    const x = team === 'blanc' ? depth : pitch.length - depth;
    const spacing = Math.min(4, pitch.width / (count + 1));
    const lineSides = sides(count);
    const line: LineRole =
      lineIndex === 0
        ? 'front'
        : lineIndex === lines.length - 1
          ? 'back'
          : 'middle';
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      const y =
        team === 'blanc' ? pitch.width / 2 + offset : pitch.width / 2 - offset;
      const id = playerId(team, number);
      const surface = surfaceOf(id);
      slots.push({
        id,
        pose: {
          x,
          y,
          angle: team === 'blanc' ? 0 : 180,
          ...(surface === undefined ? {} : { surface }),
        },
        line,
        side: lineSides[i] ?? null,
      });
      number += 1;
    }
  });
  if (slots.length !== MAX_PLAYERS) {
    throw new Error(`composition ${formation} : ${slots.length} places`);
  }
  return slots;
}
