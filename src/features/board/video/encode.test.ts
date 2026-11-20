import { describe, expect, it, vi } from 'vitest';
import {
  encoderConfig,
  type EncoderMethod,
  type RecorderMethod,
} from './codecs.ts';
import {
  encodeFrames,
  recordFrames,
  type EncoderApis,
  type FrameSource,
  type RecorderApis,
  type VideoMuxer,
} from './encode.ts';
import { phaseTimeline } from './timeline.ts';

const method: EncoderMethod = {
  kind: 'webcodecs',
  codec: 'vp9',
  mux: 'vp9',
  config: encoderConfig('vp09.00.31.08', 30),
  mimeType: 'video/mp4',
  extension: 'mp4',
};

interface Encoded {
  timestamp: number;
  duration: number | null;
  keyFrame: boolean;
}

/**
 * Un `VideoEncoder` de test : il rend ses morceaux une milliseconde plus
 * tard, comme un vrai, et garde la trace de ce qu'on lui a donné.
 */
function fakeEncoderApis(fail?: (index: number) => boolean) {
  const encoded: Encoded[] = [];
  const frames: { closed: boolean }[] = [];
  let peak = 0;
  const instances: { state: string }[] = [];

  class FakeFrame {
    closed = false;
    timestamp: number;
    duration: number | null;
    constructor(_source: unknown, init: VideoFrameInit) {
      this.timestamp = init.timestamp ?? 0;
      this.duration = init.duration ?? null;
      frames.push(this);
    }
    close() {
      this.closed = true;
    }
  }

  class FakeEncoder {
    state = 'unconfigured';
    encodeQueueSize = 0;
    config: VideoEncoderConfig | null = null;
    constructor(private init: VideoEncoderInit) {
      instances.push(this);
    }
    configure(config: VideoEncoderConfig) {
      this.config = config;
      this.state = 'configured';
    }
    encode(frame: FakeFrame, options?: VideoEncoderEncodeOptions) {
      const index = encoded.length;
      encoded.push({
        timestamp: frame.timestamp,
        duration: frame.duration,
        keyFrame: options?.keyFrame ?? false,
      });
      this.encodeQueueSize += 1;
      peak = Math.max(peak, this.encodeQueueSize);
      setTimeout(() => {
        this.encodeQueueSize -= 1;
        if (fail?.(index)) {
          this.init.error(new DOMException('encodeur perdu', 'EncodingError'));
          return;
        }
        this.init.output({ byteLength: 10 } as EncodedVideoChunk, {});
      }, 1);
    }
    async flush() {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    close() {
      this.state = 'closed';
    }
  }

  const apis = {
    VideoEncoder: FakeEncoder,
    VideoFrame: FakeFrame,
  } as unknown as EncoderApis;
  return {
    apis,
    encoded,
    frames,
    peak: () => peak,
    state: () => instances[0]?.state,
  };
}

function fakeMuxer() {
  const chunks: EncodedVideoChunk[] = [];
  const muxer: VideoMuxer = {
    add: chunk => chunks.push(chunk),
    finalize: () => new Blob(['mp4'], { type: 'video/mp4' }),
  };
  return { muxer, chunks };
}

/** Un dessin LENT, comme le vrai : c'est ce qui ne doit pas compter. */
function slowSource() {
  const painted: number[] = [];
  const source: FrameSource = {
    canvas: {} as HTMLCanvasElement,
    paint: async playhead => {
      painted.push(playhead);
      await new Promise(resolve => setTimeout(resolve, 0));
    },
  };
  return { source, painted };
}

describe('WebCodecs : chaque image a son instant', () => {
  it('horodate depuis l’index, quel que soit le temps de dessin', async () => {
    const timeline = phaseTimeline([1, 1], { fps: 30 });
    const fake = fakeEncoderApis();
    const { muxer, chunks } = fakeMuxer();
    const { source, painted } = slowSource();
    const progress: number[] = [];

    const blob = await encodeFrames(
      source,
      method,
      timeline,
      { onProgress: done => progress.push(done) },
      muxer,
      fake.apis
    );

    expect(timeline.frames).toBe(120);
    expect(fake.encoded).toHaveLength(120);
    fake.encoded.forEach((frame, i) => {
      expect(frame.timestamp).toBe(Math.round((i * 1_000_000) / 30));
      // Chaque image dure jusqu'à la suivante : aucun trou, aucun chevauchement.
      expect(frame.timestamp + frame.duration!).toBe(
        Math.round(((i + 1) * 1_000_000) / 30)
      );
    });
    // Une image clé toutes les deux secondes.
    expect(fake.encoded.filter(f => f.keyFrame).map(f => f.timestamp)).toEqual([
      0, 2_000_000,
    ]);
    expect(painted).toEqual(
      Array.from({ length: 120 }, (_, i) => timeline.playheadAt(i))
    );
    expect(fake.frames.every(f => f.closed)).toBe(true);
    expect(chunks).toHaveLength(120);
    expect(progress.at(-1)).toBe(120);
    expect(fake.state()).toBe('closed');
    expect(blob.type).toBe('video/mp4');
  });

  it('attend l’encodeur plutôt que d’empiler les images en mémoire', async () => {
    const timeline = phaseTimeline([2, 1], { fps: 30 });
    const fake = fakeEncoderApis();
    const source: FrameSource = {
      canvas: {} as HTMLCanvasElement,
      // Un dessin instantané : sans attente, la file grossirait sans fin.
      paint: () => Promise.resolve(),
    };
    await encodeFrames(
      source,
      method,
      timeline,
      {},
      fakeMuxer().muxer,
      fake.apis
    );
    expect(fake.peak()).toBeLessThanOrEqual(9);
  });

  it('s’arrête à l’annulation, et libère l’encodeur', async () => {
    const timeline = phaseTimeline([3, 3], { fps: 30 });
    const fake = fakeEncoderApis();
    const controller = new AbortController();
    const { source } = slowSource();
    const run = encodeFrames(
      source,
      method,
      timeline,
      {
        signal: controller.signal,
        onProgress: done => {
          if (done === 10) controller.abort();
        },
      },
      fakeMuxer().muxer,
      fake.apis
    );
    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.encoded.length).toBe(10);
    expect(fake.state()).toBe('closed');
  });

  it('rend l’erreur de l’encodeur', async () => {
    const timeline = phaseTimeline([1, 1], { fps: 30 });
    const fake = fakeEncoderApis(index => index === 3);
    const run = encodeFrames(
      slowSource().source,
      method,
      timeline,
      {},
      fakeMuxer().muxer,
      fake.apis
    );
    await expect(run).rejects.toMatchObject({ name: 'EncodingError' });
    expect(fake.state()).toBe('closed');
  });
});

const recorderMethod: RecorderMethod = {
  kind: 'recorder',
  codec: 'mediarecorder-webm',
  mimeType: 'video/webm;codecs=vp9',
  extension: 'webm',
};

/**
 * Le repli, sur une horloge de test : `sleep` l'avance d'autant, et le
 * dessin coûte `paintMs`. Rien n'attend pour de vrai.
 */
function fakeRecording(paintMs: number) {
  let clock = 0;
  const requests: number[] = [];
  const painted: number[] = [];
  const touched = vi.fn();
  const track = {
    requestFrame: () => requests.push(clock),
    stop: vi.fn(),
  };
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
  const canvas = {
    captureStream: (rate: number) => {
      expect(rate).toBe(0);
      return stream;
    },
    getContext: () => ({ getImageData: () => ({}), putImageData: touched }),
  } as unknown as HTMLCanvasElement;
  const source: FrameSource = {
    canvas,
    paint: playhead => {
      painted.push(playhead);
      clock += paintMs;
      return Promise.resolve();
    },
  };

  const recorders: { state: string }[] = [];
  class FakeRecorder {
    state = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(_stream: unknown, options: MediaRecorderOptions) {
      this.mimeType = options.mimeType ?? '';
      recorders.push(this);
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(['webm']) });
        this.onstop?.();
      });
    }
  }
  const apis: RecorderApis = {
    MediaRecorder: FakeRecorder as unknown as typeof MediaRecorder,
    now: () => clock,
    sleep: ms => {
      clock += ms;
      return Promise.resolve();
    },
  };
  return {
    source,
    apis,
    requests,
    painted,
    touched,
    track,
    state: () => recorders[0]?.state,
  };
}

describe('le repli MediaRecorder : la phase en temps réel', () => {
  it('donne une image par tour, et une dernière à la fin du clip', async () => {
    const timeline = phaseTimeline([1, 1], { fps: 10 });
    const fake = fakeRecording(0);
    const blob = await recordFrames(
      fake.source,
      recorderMethod,
      timeline,
      {},
      fake.apis
    );
    // Une image à chaque dixième de seconde, de 0 à 4 s comprises.
    expect(fake.requests).toEqual(
      Array.from({ length: 41 }, (_, i) => expect.closeTo(i * 100, 6))
    );
    // Les tenues ne redessinent pas le tableau : elles touchent le canevas,
    // sans quoi Chrome n'envoie pas d'image et la tenue finale disparaît.
    expect(fake.touched).toHaveBeenCalled();
    expect(fake.painted).toEqual([...new Set(fake.painted)]);
    expect(fake.state()).toBe('inactive');
    expect(fake.track.stop).toHaveBeenCalled();
    expect(blob.type).toBe('video/webm;codecs=vp9');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('un dessin lent saute des images, sans ralentir la phase', async () => {
    const timeline = phaseTimeline([1, 1], { fps: 10 });
    const fake = fakeRecording(250);
    await recordFrames(fake.source, recorderMethod, timeline, {}, fake.apis);
    // Moins de dessins que d'images…
    expect(fake.painted.length).toBeLessThan(timeline.frames / 2);
    // …mais la dernière image part toujours à la fin du clip, pas après.
    expect(fake.requests.at(-1)).toBeGreaterThanOrEqual(4_000);
    expect(fake.requests.at(-1)).toBeLessThan(4_000 + 250 + 100);
    for (let i = 1; i < fake.painted.length; i += 1) {
      expect(fake.painted[i]).toBeGreaterThan(fake.painted[i - 1]!);
    }
  });

  it('s’arrête à l’annulation et coupe la capture', async () => {
    const timeline = phaseTimeline([2, 2], { fps: 10 });
    const fake = fakeRecording(0);
    const controller = new AbortController();
    const run = recordFrames(
      fake.source,
      recorderMethod,
      timeline,
      {
        signal: controller.signal,
        onProgress: done => {
          if (done === 15) controller.abort();
        },
      },
      fake.apis
    );
    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.state()).toBe('inactive');
    expect(fake.track.stop).toHaveBeenCalled();
  });
});
