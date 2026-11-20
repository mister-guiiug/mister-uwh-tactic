/**
 * QUEL ENCODEUR, DANS QUEL NAVIGATEUR (ADR 0021).
 *
 * WebCodecs d'abord : on encode les images une à une, chacune avec son
 * horodatage, et le clip est juste quel que soit le temps de rendu. Le
 * conteneur est toujours MP4 — ce que WhatsApp accepte comme vidéo, quand un
 * WebM part en document. Dans MP4, H.264 d'abord (ce que tout téléphone
 * relit), puis VP9, puis AV1 : un Chromium sans codecs propriétaires (celui
 * de Playwright, ceux de certaines distributions) n'a pas H.264.
 *
 * Sinon `MediaRecorder`, au fil de l'horloge (`timeline.ts`). Sinon rien :
 * l'action se cache.
 */
import { VIDEO_FPS } from './timeline.ts';

export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
/** Un terrain en aplats bouge peu : 2 Mbit/s plafonnent un clip d'une minute à 15 Mo. */
export const VIDEO_BITRATE = 2_000_000;

export type VideoCodec = 'h264' | 'vp9' | 'av1';

/** Ce que le multiplexeur MP4 appelle chaque codec. */
export type MuxCodec = 'avc' | 'vp9' | 'av1';

export interface EncoderMethod {
  kind: 'webcodecs';
  codec: VideoCodec;
  mux: MuxCodec;
  config: VideoEncoderConfig;
  mimeType: 'video/mp4';
  extension: 'mp4';
}

export interface RecorderMethod {
  kind: 'recorder';
  /** `mediarecorder-mp4` ou `mediarecorder-webm`, pour la mesure. */
  codec: string;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

export type VideoMethod = EncoderMethod | RecorderMethod;

/**
 * Niveau 3.1 partout : 1 280 × 720 à 30 images/s, ni plus ni moins. Main
 * avant Baseline pour H.264 (meilleure compression, relu partout) ; les deux
 * sont essayés, un encodeur matériel n'offrant pas toujours les deux.
 */
const CANDIDATES: { codec: VideoCodec; mux: MuxCodec; id: string }[] = [
  { codec: 'h264', mux: 'avc', id: 'avc1.4d401f' },
  { codec: 'h264', mux: 'avc', id: 'avc1.42001f' },
  { codec: 'vp9', mux: 'vp9', id: 'vp09.00.31.08' },
  { codec: 'av1', mux: 'av1', id: 'av01.0.05M.08' },
];

/** MP4 d'abord, pour la même raison ; WebM s'il n'y a que lui (Firefox). */
const RECORDER_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function encoderConfig(id: string, fps: number): VideoEncoderConfig {
  return {
    codec: id,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    framerate: fps,
    bitrate: VIDEO_BITRATE,
    // Pour H.264 : la description du flux à part (avcC), comme MP4 la veut.
    ...(id.startsWith('avc1') ? { avc: { format: 'avc' as const } } : {}),
  };
}

/** Ce que le choix lit du navigateur : des doubles en test. */
export interface VideoApis {
  VideoEncoder?: Pick<typeof VideoEncoder, 'isConfigSupported'>;
  MediaRecorder?: Pick<typeof MediaRecorder, 'isTypeSupported'>;
  /** `HTMLCanvasElement.prototype.captureStream` existe-t-il ? */
  canCapture: boolean;
}

export function browserApis(): VideoApis {
  const webCodecs =
    typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';
  const recorder = typeof MediaRecorder === 'function';
  return {
    VideoEncoder: webCodecs ? VideoEncoder : undefined,
    MediaRecorder: recorder ? MediaRecorder : undefined,
    canCapture:
      typeof HTMLCanvasElement !== 'undefined' &&
      'captureStream' in HTMLCanvasElement.prototype,
  };
}

export async function pickEncoder(
  encoder: VideoApis['VideoEncoder'],
  fps: number
): Promise<EncoderMethod | null> {
  if (!encoder) return null;
  for (const candidate of CANDIDATES) {
    const config = encoderConfig(candidate.id, fps);
    try {
      const { supported } = await encoder.isConfigSupported(config);
      if (supported) {
        return {
          kind: 'webcodecs',
          codec: candidate.codec,
          mux: candidate.mux,
          config,
          mimeType: 'video/mp4',
          extension: 'mp4',
        };
      }
    } catch {
      // Une configuration que le navigateur refuse de lire : la suivante.
    }
  }
  return null;
}

export function pickRecorder(apis: VideoApis): RecorderMethod | null {
  if (!apis.MediaRecorder || !apis.canCapture) return null;
  const recorder = apis.MediaRecorder;
  const type = RECORDER_TYPES.find(t => {
    try {
      return recorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
  if (!type) return null;
  const extension = type.startsWith('video/mp4') ? 'mp4' : 'webm';
  return {
    kind: 'recorder',
    codec: `mediarecorder-${extension}`,
    mimeType: type,
    extension,
  };
}

/** WebCodecs s'il sait encoder l'un des codecs, `MediaRecorder` sinon. */
export async function chooseMethod(
  fps = VIDEO_FPS,
  apis: VideoApis = browserApis()
): Promise<VideoMethod | null> {
  return (await pickEncoder(apis.VideoEncoder, fps)) ?? pickRecorder(apis);
}
