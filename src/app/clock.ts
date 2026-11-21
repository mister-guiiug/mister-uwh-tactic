/**
 * UN CHRONOMÈTRE FAIT D'INSTANTS. Né pour la phase d'une séance (ADR 0018,
 * suivi du 20/11/2026), il tient aussi le match (ADR 0033) : la mi-temps, la
 * pause, le temps mort. Il part, se met en pause, repart, et retient s'il a
 * déjà sonné.
 *
 * Des instants, pas un décompte : un téléphone qui met l'onglet en veille ne
 * reçoit plus ses `setInterval`, et un décompte à la seconde y perdrait le
 * temps passé. L'écart à l'instant de départ, lui, reste juste.
 */
export interface PhaseClock {
  /** L'instant où le chronomètre est parti (ms). */
  startedAt: number;
  /** L'instant de la pause en cours, ou `null`. */
  pausedAt: number | null;
  /** Le temps déjà passé en pause (ms), pauses terminées. */
  pausedFor: number;
  /** Le signal de fin a été donné. */
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
 * Le temps couru (ms), pauses ôtées. Jamais négatif : un instant `now` relevé
 * avant le départ (l'horloge de l'écran avance par à-coups) ne fait pas
 * gagner de temps.
 */
export const elapsed = (clock: PhaseClock, now: number): number =>
  Math.max(0, (clock.pausedAt ?? now) - clock.startedAt - clock.pausedFor);

/** Le temps qui reste (ms) sur `minutes`, négatif une fois dépassé. */
export const timeLeft = (
  clock: PhaseClock,
  minutes: number,
  now: number
): number => minutes * 60_000 - elapsed(clock, now);

/**
 * L'INSTANT OÙ `minutes` SONT ÉCOULÉES, pauses passées comprises. Pas celui
 * où l'écran s'en aperçoit : un téléphone réveillé trois minutes après la fin
 * d'une mi-temps fait partir la pause de la fin, pas du réveil. Juste tant
 * qu'aucune pause n'a commencé après cet instant — ce que garantit qui
 * relève la fin avant de mettre en pause.
 */
export const endsAt = (clock: PhaseClock, minutes: number): number =>
  clock.startedAt + clock.pausedFor + minutes * 60_000;

/** « 4:05 », ou « +0:12 » une fois le temps dépassé. */
export function formatClock(left: number): string {
  const over = left < 0;
  // À l'écran, une seconde entamée compte : 4:05 tant qu'il reste 4 min 4,2 s.
  const seconds = over ? Math.floor(-left / 1000) : Math.ceil(left / 1000);
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return over ? `+${text}` : text;
}

/**
 * LE SIGNAL DE FIN, au poignet : deux brèves. Le téléphone posé au bord du
 * bassin se fait sentir, et le motif est le même pour une phase de séance et
 * pour une fin de match. Passé à `navigator.vibrate?.()`, muet là où l'API
 * manque (iOS) : `haptics` du socle fait la même chose, mais il est
 * « experimental » (un seul adoptant, retrait possible après le 04/01/2027)
 * et `pwa-doctor --strict` le compte comme une info.
 */
export const END_SIGNAL = [200, 100, 200];
