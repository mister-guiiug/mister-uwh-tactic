/**
 * LA MISE EN PAGE D'UNE IMAGE DU CLIP, en pixels : le titre en tête, comme
 * l'image de la phase ; le terrain dessous, aussi grand que la hauteur le
 * permet ; la consigne de l'étape dans la colonne qui reste à droite (un
 * terrain de 25 × 15 m laisse un tiers de la largeur en 16:9).
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VideoLayout {
  pad: number;
  /** Lignes de base du titre et du sous-titre. */
  titleY: number;
  subtitleY: number;
  board: Box;
  /** La colonne des consignes, ou `null` quand aucune étape n'en a. */
  note: Box | null;
  /** Ligne de base de la signature, en bas à droite. */
  brandY: number;
}

const PAD = 32;
const HEADER = 112;
const FOOTER = 40;
/** En dessous, une colonne de consignes ne tient plus une phrase lisible. */
const MIN_NOTE = 260;

export function videoLayout(
  width: number,
  height: number,
  ratio: number,
  withNotes: boolean
): VideoLayout {
  const room = height - HEADER - FOOTER;
  let h = room;
  let w = Math.round(h / ratio);
  const maxW = width - 2 * PAD - (withNotes ? MIN_NOTE + PAD : 0);
  if (w > maxW) {
    w = maxW;
    h = Math.round(w * ratio);
  }
  const y = HEADER + Math.round((room - h) / 2);
  const x = withNotes ? PAD : Math.round((width - w) / 2);
  const noteX = x + w + PAD;
  return {
    pad: PAD,
    titleY: 60,
    subtitleY: 94,
    board: { x, y, w, h },
    note: withNotes ? { x: noteX, y, w: width - PAD - noteX, h } : null,
    brandY: height - 14,
  };
}
