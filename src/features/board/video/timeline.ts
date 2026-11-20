/**
 * LE TEMPS DU CLIP, calculé avant la première image (ADR 0021).
 *
 * Chaque image du clip a son instant, et cet instant ne dépend PAS du temps
 * qu'il a fallu pour la dessiner : c'est ce qui rend le clip juste, alors
 * qu'une image du tableau coûte des dizaines de millisecondes. Le passage de
 * l'étape `i` à la suivante dure `durations[i]` secondes — le rythme de
 * « Lire », que `render.ts` lui passe. La dernière étape n'a pas de suite :
 * elle est tenue.
 */

/** Images par seconde : la fluidité d'une vidéo de téléphone. */
export const VIDEO_FPS = 30;
/** Au-delà, la phase est accélérée pour tenir : un clip, pas un film. */
export const VIDEO_MAX_SECONDS = 60;
/** La première étape, tenue avant le premier mouvement : le temps de lire le titre. */
export const LEAD_SECONDS = 1;
/** La dernière, tenue à la fin : la phase se voit arrêtée. */
export const TAIL_SECONDS = 2;

export interface PhaseTimeline {
  fps: number;
  /** Le nombre d'images. */
  frames: number;
  /** La durée du clip, en secondes : `frames / fps`. */
  seconds: number;
  /** 1 à vitesse réelle ; plus, quand la phase dépasse le plafond. */
  speed: number;
  /** La tête de lecture de l'image `index`, au sens de `frameAt`. */
  playheadAt(index: number): number;
}

export function phaseTimeline(
  durations: readonly number[],
  { fps = VIDEO_FPS, maxSeconds = VIDEO_MAX_SECONDS } = {}
): PhaseTimeline {
  const moves = durations.slice(0, -1).map(d => Math.max(d, 0));
  const motion = moves.reduce((a, b) => a + b, 0);
  const room = maxSeconds - LEAD_SECONDS - TAIL_SECONDS;
  const speed = room > 0 && motion > room ? motion / room : 1;
  const frames = Math.max(
    1,
    Math.round((LEAD_SECONDS + motion / speed + TAIL_SECONDS) * fps)
  );
  const last = Math.max(durations.length - 1, 0);

  return {
    fps,
    frames,
    seconds: frames / fps,
    speed,
    playheadAt(index) {
      let t = index / fps - LEAD_SECONDS;
      if (t <= 0) return 0;
      for (let i = 0; i < moves.length; i += 1) {
        const span = moves[i]! / speed;
        if (t < span) return i + t / span;
        t -= span;
      }
      return last;
    },
  };
}

/**
 * L'horodatage d'une image, en microsecondes, comme l'attend WebCodecs.
 * Calculé depuis l'index, jamais cumulé : aucune dérive sur 1 800 images.
 */
export function frameTimestamp(index: number, fps: number): number {
  return Math.round((index * 1_000_000) / fps);
}

/**
 * LE REPLI SUIT L'HORLOGE. `MediaRecorder` date chaque image à l'instant où
 * il la reçoit : au lieu de dessiner les images une à une (un clip ralenti),
 * on dessine celle que l'horloge attend. Un rendu lent saute des images ; il
 * ne ralentit jamais la phase.
 */
export function frameDue(elapsedMs: number, fps: number): number {
  return Math.max(0, Math.floor((elapsedMs * fps) / 1000));
}
