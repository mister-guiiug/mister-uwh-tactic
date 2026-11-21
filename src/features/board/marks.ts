import {
  clamp,
  clampToPool,
  MARK_TEXT_MAX,
  POOL_MARGIN,
  type Pitch,
  type Point,
  type Step,
  type Tactic,
  type Word,
  type Zone,
  type ZoneShape,
} from './model.ts';

/**
 * LES ZONES ET LES MOTS DE L'ENTRAÎNEUR (ADR 0026), hors du dessin : ce que
 * le tableau 2D, la scène 3D, le magasin et le lien partagent.
 *
 * Ils appartiennent à l'étape, comme les flèches, mais ils décrivent un
 * ENDROIT du bassin, pas un mouvement : une étape copiée les emporte, le
 * miroir et le changement de bassin les déplacent avec le terrain, et
 * « Replacer à l'engagement » les garde, comme la consigne.
 */

export interface Marks {
  zones: Zone[];
  words: Word[];
}

const NONE: Marks = { zones: [], words: [] };

/**
 * Les zones et les mots à l'écran à `playhead` : ceux de l'étape commencée,
 * exactement comme les flèches — les deux vues lisent cette fonction.
 */
export function marksAt(tactic: Tactic, playhead: number): Marks {
  const index = Math.min(
    Math.max(Math.floor(playhead), 0),
    tactic.steps.length - 1
  );
  const step = tactic.steps[index];
  if (!step || (!step.zones && !step.words)) return NONE;
  return { zones: step.zones ?? [], words: step.words ?? [] };
}

/** La boîte qui passe par deux coins opposés, quel que soit leur ordre. */
function boxThrough(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/** Une zone tracée d'un coin à l'autre, gardée dans le bassin. */
export function zoneFromCorners(
  shape: ZoneShape,
  from: Point,
  to: Point,
  pitch: Pitch
): Zone {
  return {
    shape,
    ...boxThrough(clampToPool(from, pitch), clampToPool(to, pitch)),
  };
}

/** Une zone ramenée dans le bassin : elle peut y rapetisser, pas en sortir. */
export function clampZone(zone: Zone, pitch: Pitch): Zone {
  const x1 = clamp(zone.x, -POOL_MARGIN, pitch.length + POOL_MARGIN);
  const x2 = clamp(zone.x + zone.w, -POOL_MARGIN, pitch.length + POOL_MARGIN);
  const y1 = clamp(zone.y, -POOL_MARGIN, pitch.width + POOL_MARGIN);
  const y2 = clamp(zone.y + zone.h, -POOL_MARGIN, pitch.width + POOL_MARGIN);
  return { ...zone, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Le centre d'une zone, où se pose son étiquette. */
export const zoneCentre = (zone: Zone): Point => ({
  x: zone.x + zone.w / 2,
  y: zone.y + zone.h / 2,
});

/** Un texte d'étiquette ou de mot, à sa longueur permise. */
export const markText = (text: string) => text.slice(0, MARK_TEXT_MAX);

/**
 * Les zones et les mots d'une étape passés par `move` — le miroir, un
 * bassin qui change de taille. Une zone suit ses deux coins : retournée,
 * elle reste une boîte à l'endroit.
 */
export function mapMarks<S extends Step>(
  step: S,
  move: (p: Point) => Point
): S {
  if (!step.zones && !step.words) return step;
  const next = { ...step };
  if (step.zones) {
    next.zones = step.zones.map(zone => ({
      ...zone,
      ...boxThrough(
        move({ x: zone.x, y: zone.y }),
        move({ x: zone.x + zone.w, y: zone.y + zone.h })
      ),
    }));
  }
  if (step.words) {
    next.words = step.words.map(word => ({
      ...word,
      ...move({ x: word.x, y: word.y }),
    }));
  }
  return next;
}

/** Les zones et les mots d'une étape, à garder quand on la replace. */
export function keepMarks(step: Step): Pick<Step, 'zones' | 'words'> {
  return {
    ...(step.zones ? { zones: step.zones } : {}),
    ...(step.words ? { words: step.words } : {}),
  };
}

/**
 * L'étape avec ces zones et ces mots ; une liste vide disparaît, pour
 * qu'une étape sans annotation reste celle d'avant, octet pour octet.
 */
export function withMarks(
  step: Step,
  patch: { zones?: Zone[]; words?: Word[] }
): Step {
  const { zones: _z, words: _w, ...rest } = step;
  const zones = 'zones' in patch ? patch.zones : step.zones;
  const words = 'words' in patch ? patch.words : step.words;
  return {
    ...rest,
    ...(zones && zones.length > 0 ? { zones } : {}),
    ...(words && words.length > 0 ? { words } : {}),
  };
}
