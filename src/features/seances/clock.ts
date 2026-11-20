/**
 * LE CHRONOMÈTRE D'UNE PHASE (ADR 0018, suivi du 20/11/2026). Une séance
 * prévoit des minutes par phase ; au bord du bassin, personne ne regarde sa
 * montre. Le chronomètre part avec la phase, se met en pause, et sonne une
 * fois quand le temps prévu est écoulé — puis compte le dépassement.
 *
 * Des instants, pas un décompte : un téléphone qui met l'onglet en veille ne
 * reçoit plus ses `setInterval`, et un décompte à la seconde y perdrait le
 * temps passé. L'écart à l'instant de départ, lui, reste juste.
 */
export interface PhaseClock {
  /** L'instant où la phase a commencé (ms). */
  startedAt: number;
  /** L'instant de la pause en cours, ou `null`. */
  pausedAt: number | null;
  /** Le temps déjà passé en pause (ms), pauses terminées. */
  pausedFor: number;
  /** Le signal de fin a été donné pour cette phase. */
  rang: boolean;
}

export const freshClock = (now: number): PhaseClock => ({
  startedAt: now,
  pausedAt: null,
  pausedFor: 0,
  rang: false,
});

export const pauseClock = (clock: PhaseClock, now: number): PhaseClock =>
  clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;

export const resumeClock = (clock: PhaseClock, now: number): PhaseClock =>
  clock.pausedAt === null
    ? clock
    : {
        ...clock,
        pausedAt: null,
        pausedFor: clock.pausedFor + Math.max(0, now - clock.pausedAt),
      };

/**
 * Le temps qui reste (ms), négatif une fois dépassé. Jamais plus que la
 * durée prévue : un instant `now` relevé avant le départ (l'horloge de
 * l'écran avance par secondes) ne fait pas gagner de temps.
 */
export function timeLeft(
  clock: PhaseClock,
  minutes: number,
  now: number
): number {
  const elapsed = Math.max(
    0,
    (clock.pausedAt ?? now) - clock.startedAt - clock.pausedFor
  );
  return minutes * 60_000 - elapsed;
}

/** « 4:05 », ou « +0:12 » une fois le temps dépassé. */
export function formatClock(left: number): string {
  const over = left < 0;
  // À l'écran, une seconde entamée compte : 4:05 tant qu'il reste 4 min 4,2 s.
  const seconds = over ? Math.floor(-left / 1000) : Math.ceil(left / 1000);
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return over ? `+${text}` : text;
}
