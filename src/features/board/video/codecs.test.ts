import { describe, expect, it, vi } from 'vitest';
import { chooseMethod, type VideoApis } from './codecs.ts';

/** Un `VideoEncoder` qui ne sait encoder que les codecs donnés. */
function encoderKnowing(...prefixes: string[]) {
  return {
    isConfigSupported: vi.fn((config: VideoEncoderConfig) =>
      Promise.resolve({
        supported: prefixes.some(p => config.codec.startsWith(p)),
        config,
      })
    ),
  };
}

/** Un `MediaRecorder` qui n'accepte que les types donnés. */
function recorderKnowing(...types: string[]) {
  return { isTypeSupported: (type: string) => types.includes(type) };
}

describe('le choix de l’encodeur', () => {
  it('prend H.264 en MP4 d’abord, ce que WhatsApp relit le mieux', async () => {
    const encoder = encoderKnowing('avc1', 'vp09', 'av01');
    const method = await chooseMethod(30, {
      VideoEncoder: encoder,
      canCapture: true,
    });
    expect(method).toMatchObject({
      kind: 'webcodecs',
      codec: 'h264',
      mux: 'avc',
      extension: 'mp4',
    });
    // La description du flux à part : MP4 la range dans `avcC`.
    expect(method?.kind === 'webcodecs' && method.config).toMatchObject({
      width: 1280,
      height: 720,
      framerate: 30,
      avc: { format: 'avc' },
    });
    expect(encoder.isConfigSupported).toHaveBeenCalledTimes(1);
  });

  it('sans H.264 (le Chromium de Playwright sous Linux), prend VP9', async () => {
    const method = await chooseMethod(30, {
      VideoEncoder: encoderKnowing('vp09', 'av01'),
      canCapture: true,
    });
    expect(method).toMatchObject({ kind: 'webcodecs', codec: 'vp9' });
    expect(method?.kind === 'webcodecs' && method.config.avc).toBeUndefined();
  });

  it('puis AV1', async () => {
    const method = await chooseMethod(30, {
      VideoEncoder: encoderKnowing('av01'),
      canCapture: true,
    });
    expect(method).toMatchObject({ kind: 'webcodecs', codec: 'av1' });
  });

  it('passe une configuration que le navigateur refuse de lire', async () => {
    const encoder = {
      isConfigSupported: (config: VideoEncoderConfig) =>
        config.codec.startsWith('avc1')
          ? Promise.reject(new TypeError('codec invalide'))
          : Promise.resolve({ supported: true, config }),
    };
    const method = await chooseMethod(30, {
      VideoEncoder: encoder,
      canCapture: true,
    });
    expect(method).toMatchObject({ codec: 'vp9' });
  });
});

describe('le repli', () => {
  const recorder = recorderKnowing(
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm'
  );

  it('sans WebCodecs, enregistre en MP4 quand MediaRecorder le sait', async () => {
    const method = await chooseMethod(30, {
      MediaRecorder: recorder,
      canCapture: true,
    });
    expect(method).toEqual({
      kind: 'recorder',
      codec: 'mediarecorder-mp4',
      mimeType: 'video/mp4',
      extension: 'mp4',
    });
  });

  it('WebCodecs présent mais sans aucun codec : MediaRecorder aussi', async () => {
    const method = await chooseMethod(30, {
      VideoEncoder: encoderKnowing(),
      MediaRecorder: recorderKnowing('video/webm;codecs=vp8'),
      canCapture: true,
    });
    expect(method).toMatchObject({
      kind: 'recorder',
      codec: 'mediarecorder-webm',
      extension: 'webm',
    });
  });

  it('rien du tout : aucune méthode, et l’action se cache', async () => {
    const none: VideoApis[] = [
      { canCapture: false },
      // Un enregistreur sans capture du canevas ne filme rien.
      { MediaRecorder: recorder, canCapture: false },
      { MediaRecorder: recorderKnowing(), canCapture: true },
      { VideoEncoder: encoderKnowing(), canCapture: false },
    ];
    for (const apis of none) {
      expect(await chooseMethod(30, apis)).toBeNull();
    }
  });
});
