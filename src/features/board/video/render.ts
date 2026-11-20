import type { Board2DLabels } from '../Board2D.tsx';
import type { Tactic } from '../model.ts';
import { boardSnapshot } from '../stepImage.tsx';
import { chooseMethod, VIDEO_HEIGHT, VIDEO_WIDTH } from './codecs.ts';
import { encodeFrames, recordFrames, type EncodeOptions } from './encode.ts';
import { createPainter, type VideoTexts } from './paint.ts';
import { SECONDS_PER_STEP } from '../store.ts';
import { phaseTimeline } from './timeline.ts';

export interface PhaseVideo {
  blob: Blob;
  /** `h264`, `vp9`, `av1`, ou `mediarecorder-…` : ce que la mesure compte. */
  codec: string;
  extension: string;
  /** La durée du clip. */
  seconds: number;
  /** 1, ou l'accélération qu'il a fallu pour tenir sous le plafond. */
  speed: number;
}

/**
 * LA PHASE EN VIDÉO (ADR 0021) : toutes ses étapes jouées, à vitesse réelle,
 * en 1 280 × 720. Ce module et tout ce qu'il tire (le multiplexeur MP4
 * compris) se chargent au clic : l'accueil n'en porte rien.
 *
 * `texts` reçoit l'accélération : au-delà du plafond, le sous-titre le dit.
 *
 * `secondsPerStep` : LE RYTHME DE « LIRE ». Le clip montre ce que
 * l'entraîneur voit en lisant la phase dans l'application — 1,6 s par
 * étape à ×1, moins à ×2 —, pas la durée de jeu réel que l'étape compte
 * pour l'apnée (5 s par défaut, trois fois plus lent).
 */
export async function renderPhaseVideo(
  tactic: Tactic,
  labels: Board2DLabels,
  texts: (speed: number) => VideoTexts,
  options: EncodeOptions = {},
  secondsPerStep = SECONDS_PER_STEP
): Promise<PhaseVideo> {
  const timeline = phaseTimeline(tactic.steps.map(() => secondsPerStep));
  const method = await chooseMethod(timeline.fps);
  if (!method) throw new Error('vidéo indisponible dans ce navigateur');

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const snapshot = boardSnapshot(tactic, labels);
  try {
    const source = {
      canvas,
      paint: createPainter(canvas, snapshot, texts(timeline.speed)),
    };
    const blob =
      method.kind === 'webcodecs'
        ? await encodeFrames(source, method, timeline, options)
        : await recordFrames(source, method, timeline, options);
    return {
      blob,
      codec: method.codec,
      extension: method.extension,
      seconds: timeline.seconds,
      speed: timeline.speed,
    };
  } finally {
    snapshot.dispose();
  }
}
