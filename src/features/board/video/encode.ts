import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import {
  VIDEO_BITRATE,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type EncoderMethod,
  type RecorderMethod,
} from './codecs.ts';
import { frameDue, frameTimestamp, type PhaseTimeline } from './timeline.ts';

/** Ce que les deux boucles attendent : le canevas, et de quoi y dessiner. */
export interface FrameSource {
  canvas: HTMLCanvasElement;
  /** Dessine l'image de la tête de lecture `playhead` sur le canevas. */
  paint(playhead: number): Promise<void>;
}

export interface EncodeOptions {
  signal?: AbortSignal;
  /** Images faites, sur le total. */
  onProgress?: (done: number, total: number) => void;
}

/** Une image clé toutes les deux secondes : un lecteur s'y retrouve vite. */
const KEYFRAME_SECONDS = 2;
/** Au-delà, on attend l'encodeur : la mémoire ne gonfle pas d'images en file. */
const MAX_QUEUE = 8;

const pause = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/** Le multiplexeur : des doubles en test, `mp4-muxer` sinon. */
export interface VideoMuxer {
  add(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  finalize(): Blob;
}

export function mp4Muxer(method: EncoderMethod, fps: number): VideoMuxer {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: method.mux,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      frameRate: fps,
    },
    // Les métadonnées en tête du fichier : la messagerie lit le clip avant
    // de l'avoir reçu en entier.
    fastStart: 'in-memory',
  });
  return {
    add: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    finalize: () => {
      muxer.finalize();
      return new Blob([target.buffer], { type: method.mimeType });
    },
  };
}

export interface EncoderApis {
  VideoEncoder: typeof VideoEncoder;
  VideoFrame: typeof VideoFrame;
}

/**
 * WEBCODECS : chaque image est dessinée, puis encodée avec SON horodatage.
 * Le temps que prend le dessin n'entre nulle part dans le clip.
 */
export async function encodeFrames(
  source: FrameSource,
  method: EncoderMethod,
  timeline: PhaseTimeline,
  { signal, onProgress }: EncodeOptions = {},
  muxer: VideoMuxer = mp4Muxer(method, timeline.fps),
  apis: EncoderApis = { VideoEncoder, VideoFrame }
): Promise<Blob> {
  const { fps, frames } = timeline;
  let failure: unknown = null;
  const encoder = new apis.VideoEncoder({
    output: (chunk, meta) => muxer.add(chunk, meta),
    error: error => {
      failure = error;
    },
  });
  try {
    encoder.configure(method.config);
    const keyEvery = Math.max(1, Math.round(fps * KEYFRAME_SECONDS));
    for (let i = 0; i < frames; i += 1) {
      signal?.throwIfAborted();
      if (failure) throw failure;
      await source.paint(timeline.playheadAt(i));
      const timestamp = frameTimestamp(i, fps);
      const frame = new apis.VideoFrame(source.canvas, {
        timestamp,
        duration: frameTimestamp(i + 1, fps) - timestamp,
      });
      try {
        encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
      } finally {
        frame.close();
      }
      while (encoder.encodeQueueSize > MAX_QUEUE && !failure) await pause(4);
      onProgress?.(i + 1, frames);
    }
    await encoder.flush();
    if (failure) throw failure;
    return muxer.finalize();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

/**
 * Marque le canevas comme redessiné sans en changer un pixel. Chrome
 * n'envoie aucune image d'un canevas intact : la tenue finale (deux
 * secondes immobiles) disparaissait du clip, qui s'arrêtait au dernier
 * mouvement — relevé le 20/11/2026, un clip de 4 s rendu en 2,04 s.
 */
function touch(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(ctx.getImageData(0, 0, 1, 1), 0, 0);
}

export interface RecorderApis {
  MediaRecorder: typeof MediaRecorder;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

/**
 * LE REPLI, `MediaRecorder` : il date les images à leur arrivée. On joue
 * donc la phase en temps réel, en dessinant à chaque tour l'image que
 * l'horloge attend (`frameDue`). Le clip dure ce qu'il doit ; un rendu lent
 * le rend moins fluide, jamais plus lent.
 */
export async function recordFrames(
  source: FrameSource,
  method: RecorderMethod,
  timeline: PhaseTimeline,
  { signal, onProgress }: EncodeOptions = {},
  apis: RecorderApis = {
    MediaRecorder,
    now: () => performance.now(),
    sleep: pause,
  }
): Promise<Blob> {
  const { fps, frames } = timeline;
  // Le canevas n'est capturé qu'à la demande (`requestFrame`) : une image
  // à moitié dessinée ne part jamais.
  const stream = source.canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as
    CanvasCaptureMediaStreamTrack | undefined;
  const recorder = new apis.MediaRecorder(stream, {
    mimeType: method.mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>(resolve => {
    recorder.onstop = () => resolve();
  });
  try {
    let drawn = timeline.playheadAt(0);
    await source.paint(drawn);
    recorder.start(1000);
    track?.requestFrame();
    const start = apis.now();
    let shown = 0;
    for (;;) {
      signal?.throwIfAborted();
      // Jusqu'à `frames` compris : une dernière image À LA FIN du clip, sans
      // quoi la tenue de la dernière étape n'aurait pas de durée.
      const due = Math.min(frameDue(apis.now() - start, fps), frames);
      if (due !== shown) {
        const playhead = timeline.playheadAt(Math.min(due, frames - 1));
        if (playhead === drawn) touch(source.canvas);
        else await source.paint(playhead);
        drawn = playhead;
        track?.requestFrame();
        shown = due;
        onProgress?.(Math.min(due + 1, frames), frames);
      }
      if (due >= frames) break;
      const next = ((shown + 1) * 1000) / fps;
      await apis.sleep(Math.max(0, next - (apis.now() - start)));
    }
    // Le temps que l'enregistreur reçoive cette dernière image.
    await apis.sleep(1000 / fps);
  } finally {
    // Arrêté, il rend son dernier morceau puis `stop` : on l'attend. Jamais
    // démarré (le premier dessin a échoué), il n'émettra rien.
    if (recorder.state !== 'inactive') {
      recorder.stop();
      await stopped;
    }
    stream.getTracks().forEach(t => t.stop());
  }
  return new Blob(chunks, { type: recorder.mimeType || method.mimeType });
}
