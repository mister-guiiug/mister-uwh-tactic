import { POOL, TEAM } from '../../../design/tokens.ts';
import { FONT, loadImage, wrap, type BoardSnapshot } from '../stepImage.tsx';
import { videoLayout } from './layout.ts';

export interface VideoTexts {
  /** Le nom du schéma, en tête de chaque image. */
  title: string;
  /** Pour chaque étape : « Étape 2 / 4 » et sa consigne. */
  steps: { label: string; note: string }[];
  /** La signature discrète, en bas à droite. */
  brand: string;
}

const NOTE_FONT = `400 24px ${FONT}`;
const NOTE_LINE = 34;

/**
 * DESSINE UNE IMAGE DU CLIP sur le canevas : le tableau tel que `Board2D` le
 * dessine (le SVG de l'image d'étape, `stepImage.tsx`), aux couleurs du
 * thème clair, avec le titre, l'étape en cours et sa consigne.
 *
 * Le SVG est chargé AVANT de toucher au canevas : l'image n'est jamais vue à
 * moitié peinte. Une tête de lecture inchangée (les secondes tenues au début
 * et à la fin) ne redessine rien.
 */
export function createPainter(
  canvas: HTMLCanvasElement,
  snapshot: BoardSnapshot,
  texts: VideoTexts
): (playhead: number) => Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canevas indisponible');
  const { width, height } = canvas;
  const withNotes = texts.steps.some(s => s.note.trim());
  const layout = videoLayout(width, height, snapshot.ratio, withNotes);
  const { board, note, pad } = layout;
  const last = Math.max(texts.steps.length - 1, 0);

  const notes = new Map<number, string[]>();
  const noteLines = (step: number): string[] => {
    const cached = notes.get(step);
    if (cached) return cached;
    const text = texts.steps[step]?.note ?? '';
    const max = note ? Math.max(1, Math.floor(note.h / NOTE_LINE)) : 0;
    ctx.font = NOTE_FONT;
    let lines = note && text ? wrap(ctx, text, note.w) : [];
    if (lines.length > max) {
      lines = lines.slice(0, max);
      lines[max - 1] = `${lines[max - 1]} …`;
    }
    notes.set(step, lines);
    return lines;
  };

  let painted = Number.NaN;
  return async playhead => {
    if (playhead === painted) return;
    const step = Math.min(Math.max(Math.floor(playhead), 0), last);
    const url = URL.createObjectURL(
      new Blob([snapshot.svg(playhead, board.w)], { type: 'image/svg+xml' })
    );
    try {
      const image = await loadImage(url);

      ctx.textAlign = 'left';
      ctx.fillStyle = TEAM.blanc.zone;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = POOL.ink;
      ctx.font = `700 36px ${FONT}`;
      ctx.fillText(texts.title, pad, layout.titleY, width - 2 * pad);
      ctx.fillStyle = POOL.line;
      ctx.font = `500 24px ${FONT}`;
      ctx.fillText(
        texts.steps[step]?.label ?? '',
        pad,
        layout.subtitleY,
        width - 2 * pad
      );

      ctx.drawImage(image, board.x, board.y, board.w, board.h);

      if (note) {
        const lines = noteLines(step);
        ctx.fillStyle = POOL.ink;
        ctx.font = NOTE_FONT;
        lines.forEach((line, i) => {
          ctx.fillText(line, note.x, note.y + 24 + i * NOTE_LINE, note.w);
        });
      }

      ctx.fillStyle = POOL.line;
      ctx.font = `600 18px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(texts.brand, width - pad, layout.brandY);
      painted = playhead;
    } finally {
      URL.revokeObjectURL(url);
    }
  };
}
