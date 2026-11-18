import {
  INNER_RECT,
  substitutionZone,
  type Pitch,
  type Team,
} from './model.ts';

/**
 * LE TRACÉ DU TERRAIN, décrit une fois et dessiné deux fois : en SVG pour le
 * tableau, sur un canevas pour le fond du bassin en 3D. Deux tracés écrits à
 * la main finiraient par ne plus coïncider, et c'est précisément ce qu'on
 * compare quand on passe d'une vue à l'autre.
 *
 * D'après le règlement international (CMAS, 12ᵉ édition, règles 1.1.7 à
 * 1.1.9) : au centre de chaque ligne de but, une zone de but en demi-cercle
 * PLEIN de 3 m de rayon et une zone de tir de pénalité en demi-cercle
 * POINTILLÉ de 6 m ; un point de pénalité au milieu de l'arc de 3 m ; un point
 * central. S'y ajoutent les quarts de cercle de 1 m aux coins et le rectangle
 * tracé à 5 m des lignes de but et 2 m des bords : la zone où se remet en jeu
 * un palet neutre ou d'avantage (règles 17.5 et 17.6).
 *
 * La LIGNE MÉDIANE et les ZONES DE REMPLACEMENT ne sont pas des marquages du
 * fond : ce sont des repères. Les schémas de la présentation du sport par UWH
 * News coupent le terrain en deux moitiés — c'est ainsi qu'on lit une
 * composition —, et les remplaçants entrent par une zone hors du terrain.
 *
 * Angles en degrés, 0° vers les x croissants, sens horaire vu de dessus (le
 * repère du SVG et du canevas, `y` vers le bas).
 */
export type MarkingStyle = 'solid' | 'dotted' | 'thin';

export type Marking =
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      style: MarkingStyle;
    }
  | {
      kind: 'arc';
      cx: number;
      cy: number;
      r: number;
      start: number;
      end: number;
      style: MarkingStyle;
    }
  | { kind: 'spot'; x: number; y: number; r: number }
  | { kind: 'goal'; x: number; y1: number; y2: number; team: Team }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      style: MarkingStyle;
    }
  | { kind: 'zone'; x: number; y: number; w: number; h: number; team: Team };

/**
 * LE BUT, D'APRÈS LE RÈGLEMENT (FFESSM, formation AN2 « Règles du jeu »
 * 2016–2017, conforme aux règles CMAS vol. 2 v10.06, page « Les buts ») : un
 * bac en acier de 2 mm au moins, ouvert sur les côtés, posé au milieu de la
 * ligne de but — le mur — et fixé. En coupe, depuis le terrain : une RAMPE
 * de 180 mm à 11 %, qui monte donc de 20 mm, une CUVETTE de 120 mm, une
 * PAROI ARRIÈRE de 180 mm de haut. 3 000 mm de long entre les deux « limites
 * des 3 m », 3 360 mm avec les deux PENTES DE CÔTÉ de 180 mm.
 *
 * Le bac est DANS le terrain, contre le mur, la rampe tournée vers le jeu.
 * Il était dessiné derrière la ligne de but, comme un bloc blanc ou noir.
 */
export const GOAL_TRAY = {
  /** Entre les limites des 3 m : la largeur où le but compte. */
  width: 3,
  /** Les deux pentes de côté comprises. */
  total: 3.36,
  side: 0.18,
  ramp: 0.18,
  trough: 0.12,
  /** De la paroi au pied de la rampe. */
  depth: 0.3,
  wall: 0.18,
  /** Ce que la rampe monte : 180 mm à 11 %. */
  lip: 0.02,
  slope: 0.11,
} as const;

export const GOAL_WIDTH = GOAL_TRAY.width;
export const GOAL_AREA_RADIUS = 3;
export const PENALTY_AREA_RADIUS = 6;
export const CORNER_RADIUS = 1;
/** Le rectangle de remise en jeu (voir `INNER_RECT` dans le modèle). */
export const INNER_RECT_INSET = INNER_RECT;

export function pitchMarkings(pitch: Pitch): Marking[] {
  const { length: L, width: W } = pitch;
  const midY = W / 2;
  return [
    { kind: 'rect', x: 0, y: 0, w: L, h: W, style: 'solid' },
    ...(['blanc', 'noir'] as const).map(team => {
      const z = substitutionZone(team, pitch);
      return {
        kind: 'zone' as const,
        x: z.x1,
        y: z.y1,
        w: z.x2 - z.x1,
        h: z.y2 - z.y1,
        team,
      };
    }),
    // Repère : la ligne médiane, qui sépare les deux moitiés.
    { kind: 'line', x1: L / 2, y1: 0, x2: L / 2, y2: W, style: 'thin' },
    {
      kind: 'rect',
      x: INNER_RECT_INSET.ends,
      y: INNER_RECT_INSET.sides,
      w: L - 2 * INNER_RECT_INSET.ends,
      h: W - 2 * INNER_RECT_INSET.sides,
      style: 'thin',
    },
    // Zones de but (3 m, trait plein) et de pénalité (6 m, pointillé).
    {
      kind: 'arc',
      cx: 0,
      cy: midY,
      r: GOAL_AREA_RADIUS,
      start: -90,
      end: 90,
      style: 'solid',
    },
    {
      kind: 'arc',
      cx: L,
      cy: midY,
      r: GOAL_AREA_RADIUS,
      start: 90,
      end: 270,
      style: 'solid',
    },
    {
      kind: 'arc',
      cx: 0,
      cy: midY,
      r: PENALTY_AREA_RADIUS,
      start: -90,
      end: 90,
      style: 'dotted',
    },
    {
      kind: 'arc',
      cx: L,
      cy: midY,
      r: PENALTY_AREA_RADIUS,
      start: 90,
      end: 270,
      style: 'dotted',
    },
    // Quarts de cercle des coins.
    {
      kind: 'arc',
      cx: 0,
      cy: 0,
      r: CORNER_RADIUS,
      start: 0,
      end: 90,
      style: 'thin',
    },
    {
      kind: 'arc',
      cx: L,
      cy: 0,
      r: CORNER_RADIUS,
      start: 90,
      end: 180,
      style: 'thin',
    },
    {
      kind: 'arc',
      cx: L,
      cy: W,
      r: CORNER_RADIUS,
      start: 180,
      end: 270,
      style: 'thin',
    },
    {
      kind: 'arc',
      cx: 0,
      cy: W,
      r: CORNER_RADIUS,
      start: 270,
      end: 360,
      style: 'thin',
    },
    // Points de pénalité et point central.
    { kind: 'spot', x: GOAL_AREA_RADIUS, y: midY, r: 0.1 },
    { kind: 'spot', x: L - GOAL_AREA_RADIUS, y: midY, r: 0.1 },
    { kind: 'spot', x: L / 2, y: midY, r: 0.1 },
    // Les buts : 3 m au centre de chaque ligne de but.
    {
      kind: 'goal',
      x: 0,
      y1: midY - GOAL_WIDTH / 2,
      y2: midY + GOAL_WIDTH / 2,
      team: 'blanc',
    },
    {
      kind: 'goal',
      x: L,
      y1: midY - GOAL_WIDTH / 2,
      y2: midY + GOAL_WIDTH / 2,
      team: 'noir',
    },
  ];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Le chemin SVG d'un arc de cercle, de `start` à `end` dans le sens horaire. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number
): string {
  const x1 = cx + r * Math.cos(rad(start));
  const y1 = cy + r * Math.sin(rad(start));
  const x2 = cx + r * Math.cos(rad(end));
  const y2 = cy + r * Math.sin(rad(end));
  const large = end - start > 180 ? 1 : 0;
  const f = (n: number) => Number(n.toFixed(3));
  return `M ${f(x1)} ${f(y1)} A ${r} ${r} 0 ${large} 1 ${f(x2)} ${f(y2)}`;
}

/** Le chemin SVG d'un secteur (le champ de vision d'un arbitre). */
export function sectorPath(
  cx: number,
  cy: number,
  r: number,
  heading: number,
  aperture: number
): string {
  const start = heading - aperture / 2;
  const end = heading + aperture / 2;
  return `M ${cx} ${cy} L ${arcPath(cx, cy, r, start, end).slice(2)} Z`;
}

export interface CanvasPalette {
  water: string;
  line: string;
  goalBlanc: string;
  goalNoir: string;
}

/**
 * Le même tracé sur un canevas 2D, `scale` pixels par mètre, avec une marge
 * de `margin` mètres autour du terrain — c'est la texture du fond du bassin.
 */
export function drawPitchOnCanvas(
  ctx: CanvasRenderingContext2D,
  pitch: Pitch,
  scale: number,
  margin: number,
  palette: CanvasPalette
): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = palette.water;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(margin, margin);
  ctx.strokeStyle = palette.line;
  ctx.fillStyle = palette.line;
  ctx.lineCap = 'round';

  for (const m of pitchMarkings(pitch)) {
    ctx.setLineDash(
      m.kind === 'arc' && m.style === 'dotted' ? [0.25, 0.3] : []
    );
    ctx.lineWidth = 'style' in m && m.style === 'thin' ? 0.05 : 0.08;
    switch (m.kind) {
      case 'rect':
        ctx.strokeRect(m.x, m.y, m.w, m.h);
        break;
      case 'arc':
        ctx.beginPath();
        ctx.arc(m.cx, m.cy, m.r, rad(m.start), rad(m.end));
        ctx.stroke();
        break;
      case 'spot':
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
        ctx.stroke();
        break;
      case 'zone':
        ctx.save();
        ctx.setLineDash([0.2, 0.15]);
        ctx.lineWidth = 0.04;
        ctx.fillStyle =
          m.team === 'blanc' ? palette.goalBlanc : palette.goalNoir;
        ctx.globalAlpha = m.team === 'blanc' ? 0.35 : 0.18;
        ctx.fillRect(m.x, m.y, m.w, m.h);
        ctx.globalAlpha = 1;
        ctx.strokeRect(m.x, m.y, m.w, m.h);
        ctx.restore();
        break;
      case 'goal': {
        // L'OMBRE DU BAC sur le fond : la 3D pose le bac lui-même dessus.
        const into = m.x === 0 ? 1 : -1;
        const mid = (m.y1 + m.y2) / 2;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillRect(
          into > 0 ? m.x : m.x - GOAL_TRAY.depth,
          mid - GOAL_TRAY.total / 2,
          GOAL_TRAY.depth,
          GOAL_TRAY.total
        );
        ctx.restore();
        break;
      }
    }
  }
  ctx.restore();
}
