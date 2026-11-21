import type { Pitch, Point } from './model.ts';

/**
 * Marge autour du terrain, en mètres : le mètre de bassin où nagent les
 * remplaçants, puis la plage où se tient l'arbitre de bord.
 */
export const MARGIN = 2.4;

/**
 * LE CADRE DU TABLEAU : ce que montre le SVG de `Board2D`, en mètres, et la
 * façon dont le terrain y est posé. Couché, il s'étend en long ; dressé (un
 * téléphone tenu droit), il tourne d'un quart de tour, le but des Blancs en
 * haut.
 *
 * ÉCRIT UNE FOIS, ICI, hors du composant : `Board2D` le dessine, et un calque
 * posé sur lui (« À toi de jouer », ADR 0022) convertit un point de l'écran
 * avec la même géométrie, sans la recopier (`learn/screen.ts`). Un `.tsx`
 * n'exporte que des composants (`react-refresh/only-export-components`) :
 * d'où ce module à part.
 */
export interface BoardFrame {
  /** La boîte de vue du SVG, en mètres. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Le quart de tour du terrain dressé, à poser sur le groupe du terrain. */
  transform: string | undefined;
  /** Un point du terrain, dans la boîte de vue : ce que fait `transform`. */
  toView: (point: Point) => Point;
  /** Un point de la boîte de vue, ramené dans le repère du terrain. */
  toPitch: (view: Point) => Point;
}

export function boardFrame(pitch: Pitch, portrait: boolean): BoardFrame {
  const long = pitch.length + 2 * MARGIN;
  const across = pitch.width + 2 * MARGIN;
  return {
    x: -MARGIN,
    y: -MARGIN,
    w: portrait ? across : long,
    h: portrait ? long : across,
    // Dressé, le but des Blancs est en haut : (x, y) → (largeur − y, x).
    transform: portrait ? `translate(${pitch.width} 0) rotate(90)` : undefined,
    toView: point =>
      portrait
        ? { x: pitch.width - point.y, y: point.x }
        : { x: point.x, y: point.y },
    toPitch: view =>
      portrait
        ? { x: view.y, y: pitch.width - view.x }
        : { x: view.x, y: view.y },
  };
}
