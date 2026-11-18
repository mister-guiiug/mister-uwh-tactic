import { downloadBlob, dateSlug } from '@mister-guiiug/dev-pwa-config/download';

/**
 * ENREGISTRER LA PHASE EN VIDÉO, depuis le canevas de la scène 3D.
 *
 * `captureStream` + `MediaRecorder` : le navigateur encode lui-même, rien ne
 * part sur un serveur. Le fichier (WebM, ou MP4 là où le navigateur le
 * préfère) s'envoie tel quel dans une messagerie.
 */
export function canRecord(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype
  );
}

function pickType(): string | undefined {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  return types.find(type => MediaRecorder.isTypeSupported?.(type));
}

/**
 * Enregistre `canvas` jusqu'à ce que `until` se résolve, puis télécharge le
 * fichier. Rend `false` si le navigateur ne sait pas enregistrer.
 */
export async function recordCanvas(
  canvas: HTMLCanvasElement,
  until: Promise<void>,
  name: string
): Promise<boolean> {
  if (!canRecord()) return false;
  const stream = canvas.captureStream(30);
  const type = pickType();
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : {});
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>(resolve => {
    recorder.onstop = () => resolve();
  });
  recorder.start(250);
  await until;
  // Une demi-seconde de plus : la dernière étape se voit arrêtée.
  await new Promise(resolve => setTimeout(resolve, 500));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach(track => track.stop());
  const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
  return downloadBlob(blob, `${name || 'phase'}-${dateSlug()}.${extension}`);
}

/** Un nom de fichier sûr, tiré du nom du schéma. */
export function fileName(name: string): string {
  return (
    name
      .normalize('NFD')
      // Les accents, séparés par NFD, tombent avec le reste du non-ASCII.
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'phase'
  );
}
