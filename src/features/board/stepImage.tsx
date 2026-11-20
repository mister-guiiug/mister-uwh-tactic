import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { CSS_VARS, POOL, TEAM } from '../../design/tokens.ts';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import type { Tactic } from './model.ts';

export interface StepImageTexts {
  /** Le nom du schéma, en titre. */
  title: string;
  /** « Étape 2 / 3 · 4 s ». */
  subtitle: string;
  /** La consigne de l'étape, sous le terrain. */
  note: string;
  /** La signature discrète, en bas à droite. */
  brand: string;
}

const WIDTH = 1600;
const PAD = 48;
export const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/**
 * Le SVG du tableau lit ses couleurs de thème en `var(--uwh-…)`. Une image
 * autonome n'a pas la feuille de style : on y écrit les valeurs CLAIRES de
 * `tokens.ts`, pour que l'image envoyée soit la même de jour comme de nuit.
 */
function inlineColors(svg: string): string {
  return svg.replace(
    /var\((--uwh-[a-z-]+)\)/g,
    (_, name: string) => (CSS_VARS as Record<string, string>)[name] ?? POOL.ink
  );
}

/**
 * LE TABLEAU HORS ÉCRAN, monté une fois et redessiné à la demande : `Board2D`
 * dans un conteneur invisible, une tête de lecture fixe. Une image le monte
 * pour une étape ; la vidéo de la phase (`video/`), pour des centaines
 * d'images — d'où une seule racine React, et non une par image.
 */
export interface BoardSnapshot {
  /** Hauteur sur largeur du terrain dessiné. */
  readonly ratio: number;
  /** Le SVG autonome du tableau à `playhead`, large de `width` pixels. */
  svg(playhead: number, width: number): string;
  dispose(): void;
}

export function boardSnapshot(
  tactic: Tactic,
  labels: Board2DLabels
): BoardSnapshot {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;`;
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  const root = createRoot(host);
  const dispose = () => {
    root.unmount();
    host.remove();
  };
  const draw = (playhead: number): SVGSVGElement => {
    flushSync(() =>
      root.render(
        <Board2D
          labels={labels}
          tactic={tactic}
          playhead={playhead}
          orientation="landscape"
        />
      )
    );
    const svg = host.querySelector('svg');
    if (!svg) throw new Error('tableau introuvable');
    return svg;
  };
  let ratio: number;
  try {
    const [, , w, h] = (draw(0).getAttribute('viewBox') ?? '0 0 1 1')
      .split(/\s+/)
      .map(Number);
    ratio = (h ?? 1) / (w ?? 1);
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    ratio,
    svg(playhead, width) {
      const clone = draw(playhead).cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(Math.round(width * ratio)));
      clone.setAttribute('font-family', FONT);
      clone.removeAttribute('class');
      return inlineColors(new XMLSerializer().serializeToString(clone));
    },
    dispose,
  };
}

/** Le SVG d'une étape, dessiné par `Board2D` dans un conteneur hors écran. */
function stepSvg(
  tactic: Tactic,
  step: number,
  labels: Board2DLabels
): { markup: string; ratio: number } {
  const snapshot = boardSnapshot(tactic, labels);
  try {
    return {
      markup: snapshot.svg(step, WIDTH - 2 * PAD),
      ratio: snapshot.ratio,
    };
  } finally {
    snapshot.dispose();
  }
}

/** Coupe un texte en lignes qui tiennent dans `max` pixels. */
export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image illisible'));
    image.src = url;
  });
}

/**
 * L'ÉTAPE EN IMAGE : le terrain tel que le tableau le dessine, le nom du
 * schéma au-dessus, la consigne dessous — de quoi l'envoyer dans le groupe
 * de l'équipe, où un lien vers une application ne s'ouvre pas toujours.
 *
 * Tout se fait dans le navigateur, sur un canevas : rien ne part sur un
 * serveur. Toujours en paysage, toujours aux couleurs du thème clair.
 */
export async function renderStepImage(
  tactic: Tactic,
  step: number,
  labels: Board2DLabels,
  texts: StepImageTexts
): Promise<Blob> {
  const { markup, ratio } = stepSvg(tactic, step, labels);
  const boardW = WIDTH - 2 * PAD;
  const boardH = Math.round(boardW * ratio);

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canevas indisponible');
  measure.font = `400 32px ${FONT}`;
  const noteLines = texts.note ? wrap(measure, texts.note, boardW) : [];

  const headerH = 128;
  const noteH = noteLines.length ? noteLines.length * 44 + 24 : 0;
  const footerH = 64;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = headerH + boardH + noteH + footerH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canevas indisponible');

  ctx.fillStyle = TEAM.blanc.zone;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = POOL.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(texts.title, PAD, 70, boardW);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = POOL.line;
  ctx.fillText(texts.subtitle, PAD, 108, boardW);

  const url = URL.createObjectURL(
    new Blob([markup], { type: 'image/svg+xml' })
  );
  try {
    const image = await loadImage(url);
    ctx.drawImage(image, PAD, headerH, boardW, boardH);
  } finally {
    URL.revokeObjectURL(url);
  }

  ctx.fillStyle = POOL.ink;
  ctx.font = `400 32px ${FONT}`;
  noteLines.forEach((line, i) => {
    ctx.fillText(line, PAD, headerH + boardH + 52 + i * 44, boardW);
  });

  ctx.fillStyle = POOL.line;
  ctx.font = `600 24px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(texts.brand, WIDTH - PAD, canvas.height - 24);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('export refusé'))),
      'image/png'
    )
  );
}

export interface PhaseImageTexts {
  title: string;
  subtitle: string;
  /** Pour chaque étape : « Étape 2 · 4 s » et sa consigne. */
  steps: { label: string; note: string }[];
  brand: string;
}

/** Au-delà, la consigne est coupée : la vignette reste lisible. */
const MAX_NOTE_LINES = 4;

/**
 * TOUTE LA PHASE EN UNE IMAGE : les étapes en grille, deux par rang, chacune
 * avec son titre et sa consigne. Pour le groupe de l'équipe, où dix images
 * séparées arrivent dans le désordre et où une fiche PDF ne s'ouvre pas.
 */
export async function renderPhaseImage(
  tactic: Tactic,
  labels: Board2DLabels,
  texts: PhaseImageTexts
): Promise<Blob> {
  const count = tactic.steps.length;
  const cols = count > 1 ? 2 : 1;
  const gap = 32;
  const cellW = Math.floor((WIDTH - 2 * PAD - (cols - 1) * gap) / cols);
  const snapshot = boardSnapshot(tactic, labels);
  let svgs: { markup: string; ratio: number }[];
  try {
    svgs = tactic.steps.map((_, i) => ({
      markup: snapshot.svg(i, WIDTH - 2 * PAD),
      ratio: snapshot.ratio,
    }));
  } finally {
    snapshot.dispose();
  }
  const boardH = Math.round(cellW * (svgs[0]?.ratio ?? 0.66));

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canevas indisponible');
  measure.font = `400 26px ${FONT}`;
  const notes = texts.steps.map(s => {
    const lines = s.note ? wrap(measure, s.note, cellW) : [];
    if (lines.length <= MAX_NOTE_LINES) return lines;
    const kept = lines.slice(0, MAX_NOTE_LINES);
    kept[MAX_NOTE_LINES - 1] = `${kept[MAX_NOTE_LINES - 1]} …`;
    return kept;
  });

  const headerH = 128;
  const labelH = 44;
  const lineH = 34;
  const rows: number[] = [];
  for (let r = 0; r * cols < count; r += 1) {
    const inRow = notes.slice(r * cols, r * cols + cols);
    const most = Math.max(0, ...inRow.map(lines => lines.length));
    rows.push(labelH + boardH + (most ? most * lineH + 12 : 0) + gap);
  }
  const footerH = 56;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = headerH + rows.reduce((a, b) => a + b, 0) + footerH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canevas indisponible');

  ctx.fillStyle = TEAM.blanc.zone;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = POOL.ink;
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(texts.title, PAD, 70, WIDTH - 2 * PAD);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = POOL.line;
  ctx.fillText(texts.subtitle, PAD, 108, WIDTH - 2 * PAD);

  let top = headerH;
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      const svg = svgs[i];
      if (!svg) continue;
      const left = PAD + c * (cellW + gap);
      ctx.fillStyle = POOL.ink;
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(texts.steps[i]?.label ?? '', left, top + 30, cellW);
      const url = URL.createObjectURL(
        new Blob([svg.markup], { type: 'image/svg+xml' })
      );
      try {
        const image = await loadImage(url);
        ctx.drawImage(image, left, top + labelH, cellW, boardH);
      } finally {
        URL.revokeObjectURL(url);
      }
      ctx.font = `400 26px ${FONT}`;
      notes[i]!.forEach((line, n) => {
        ctx.fillText(line, left, top + labelH + boardH + 34 + n * lineH, cellW);
      });
    }
    top += rows[r]!;
  }

  ctx.fillStyle = POOL.line;
  ctx.font = `600 24px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(texts.brand, WIDTH - PAD, canvas.height - 20);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('export refusé'))),
      'image/png'
    )
  );
}
