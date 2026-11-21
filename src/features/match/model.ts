import { z } from 'zod';
import { TEAMS, type Team } from '../board/model.ts';
import {
  elapsed,
  endsAt,
  freshClock,
  pauseClock,
  resumeClock,
  timeLeft,
  type PhaseClock,
} from '../../app/clock.ts';

/**
 * LE MATCH D'ENTRAÎNEMENT (ADR 0033) : deux mi-temps et une pause, le score
 * des Blancs et des Noirs, les temps morts, les exclusions. Tenu au bord du
 * bassin sur un téléphone, par quelqu'un qui regarde le jeu, pas l'écran.
 *
 * TOUT EST FAIT D'INSTANTS (`app/clock.ts`). Le temps qui reste se calcule à
 * la demande, à partir de l'instant de départ et des pauses ; rien ne se
 * décompte seconde par seconde. Un onglet en veille, un écran éteint, un
 * rechargement ne font rien perdre : au retour, `settle` relève ce qui s'est
 * terminé entre-temps, à l'instant où ça s'est terminé.
 *
 * LES EXCLUSIONS COMPTENT EN TEMPS DE JEU, comme au règlement : le chrono
 * arrêté (pause, temps mort, mi-temps finie), elles s'arrêtent avec lui. Une
 * exclusion retient donc le temps de jeu couru à son début (`at`), pas un
 * instant ; elle passe la pause et finit en seconde mi-temps.
 */

export const MATCH_VERSION = 1;

/** Deux mi-temps : le règlement, et les matchs d'entraînement. */
export const HALVES = 2;
export type Half = 1 | 2;

/** Une minute, une fois par mi-temps et par équipe (lexique, « Temps mort »). */
export const TIMEOUT_MINUTES = 1;

/** Les exclusions temporaires du règlement : 2 ou 5 minutes. */
export const EXCLUSION_MINUTES = [2, 5] as const;

export const MATCH_LIMITS = {
  halfMinutes: { min: 1, max: 45, initial: 10 },
  breakMinutes: { min: 1, max: 15, initial: 3 },
  number: { min: 1, max: 99 },
  exclusions: 30,
} as const;

const clockSchema: z.ZodType<PhaseClock> = z.object({
  startedAt: z.number(),
  pausedAt: z.number().nullable(),
  pausedFor: z.number().min(0),
  rang: z.boolean(),
});

const teamSchema = z.enum(TEAMS);

const perTeamSchema = z.object({
  blanc: z.number().int().min(0).max(999),
  noir: z.number().int().min(0).max(999),
});
export type PerTeam = z.infer<typeof perTeamSchema>;

export const exclusionSchema = z.object({
  id: z.string().min(1).max(40),
  team: teamSchema,
  /** Le numéro du bonnet. */
  number: z
    .number()
    .int()
    .min(MATCH_LIMITS.number.min)
    .max(MATCH_LIMITS.number.max),
  minutes: z.number().int().min(1).max(60),
  /** Le temps de jeu couru au début de l'exclusion (ms). */
  at: z.number().min(0),
  /** Sa fin a été signalée. */
  rang: z.boolean(),
});
export type Exclusion = z.infer<typeof exclusionSchema>;

export const matchSchema = z.object({
  halfMinutes: z
    .number()
    .int()
    .min(MATCH_LIMITS.halfMinutes.min)
    .max(MATCH_LIMITS.halfMinutes.max),
  breakMinutes: z
    .number()
    .int()
    .min(MATCH_LIMITS.breakMinutes.min)
    .max(MATCH_LIMITS.breakMinutes.max),
  /**
   * `ready` avant le coup d'envoi, `half` pendant une mi-temps, `break`
   * pendant la pause, `over` une fois la dernière mi-temps finie.
   */
  phase: z.enum(['ready', 'half', 'break', 'over']),
  /** La mi-temps en cours — pendant la pause, celle qui vient. */
  half: z.union([z.literal(1), z.literal(2)]),
  /** Le chronomètre de la mi-temps ou de la pause en cours. */
  clock: clockSchema,
  /** Le temps de jeu des mi-temps finies (ms). */
  played: z.number().min(0),
  score: perTeamSchema,
  /** Les temps morts pris dans la mi-temps en cours. */
  timeouts: perTeamSchema,
  timeout: z.object({ team: teamSchema, clock: clockSchema }).nullable(),
  exclusions: z.array(exclusionSchema).max(MATCH_LIMITS.exclusions),
});
export type Match = z.infer<typeof matchSchema>;
export type MatchSettings = Pick<Match, 'halfMinutes' | 'breakMinutes'>;

/** Ce qui se termine, et qu'on signale une fois. */
export type MatchEnd =
  | { kind: 'half'; half: Half }
  | { kind: 'break' }
  | { kind: 'timeout'; team: Team }
  | { kind: 'exclusion'; team: Team; number: number };

const zero = (): PerTeam => ({ blanc: 0, noir: 0 });

export const newMatch = (settings?: Partial<MatchSettings>): Match => ({
  halfMinutes: settings?.halfMinutes ?? MATCH_LIMITS.halfMinutes.initial,
  breakMinutes: settings?.breakMinutes ?? MATCH_LIMITS.breakMinutes.initial,
  phase: 'ready',
  half: 1,
  clock: freshClock(0),
  played: 0,
  score: zero(),
  timeouts: zero(),
  timeout: null,
  exclusions: [],
});

const halfMs = (match: Match) => match.halfMinutes * 60_000;

/** Le temps de jeu couru depuis le coup d'envoi (ms). */
export const playTime = (match: Match, now: number): number =>
  match.phase === 'half'
    ? match.played + Math.min(elapsed(match.clock, now), halfMs(match))
    : match.played;

export const isPaused = (match: Match) =>
  match.phase === 'half' && match.clock.pausedAt !== null;

/** Commencé, pas fini : l'écran reste allumé. */
export const inProgress = (match: Match) =>
  match.phase === 'half' || match.phase === 'break';

/** Quelque chose tourne : l'écran se relit. */
export const isTicking = (match: Match) =>
  (match.phase === 'half' && match.clock.pausedAt === null) ||
  match.phase === 'break' ||
  match.timeout !== null;

/**
 * Le grand chiffre : la mi-temps qui reste, la pause (en dépassement une fois
 * finie : la seconde mi-temps part au signal de l'arbitre, pas de l'écran).
 */
export function clockLeft(match: Match, now: number): number {
  switch (match.phase) {
    case 'ready':
      return halfMs(match);
    case 'half':
      return Math.max(0, timeLeft(match.clock, match.halfMinutes, now));
    case 'break':
      return timeLeft(match.clock, match.breakMinutes, now);
    case 'over':
      return 0;
  }
}

export const timeoutLeft = (match: Match, now: number): number =>
  match.timeout
    ? Math.max(0, timeLeft(match.timeout.clock, TIMEOUT_MINUTES, now))
    : 0;

/** Ce qui reste d'une exclusion (ms), en temps de jeu ; jamais négatif. */
export const exclusionLeft = (
  match: Match,
  exclusion: Exclusion,
  now: number
): number =>
  Math.max(0, exclusion.at + exclusion.minutes * 60_000 - playTime(match, now));

/** La mi-temps finit à `at` : la pause part de là, ou le match s'achève. */
function finishHalf(match: Match, at: number): Match {
  const played =
    match.played + Math.min(elapsed(match.clock, at), halfMs(match));
  if (match.half >= HALVES) {
    return {
      ...match,
      phase: 'over',
      played,
      clock: pauseClock(match.clock, at),
      timeout: null,
    };
  }
  return {
    ...match,
    phase: 'break',
    half: (match.half + 1) as Half,
    played,
    clock: freshClock(at),
    timeout: null,
  };
}

/**
 * MET LE MATCH À L'HEURE : ce qui s'est terminé avant `now` l'est, à son
 * instant, et chaque fin n'est rendue qu'une fois — elle est marquée
 * (`rang`) ou elle a changé la phase. Rend le même objet quand rien ne
 * change : l'appeler à chaque relevé de l'écran ne coûte rien.
 */
export function settle(
  match: Match,
  now: number
): { match: Match; ends: MatchEnd[] } {
  const ends: MatchEnd[] = [];
  let next = match;

  const timeout = next.timeout;
  if (
    timeout &&
    !timeout.clock.rang &&
    timeLeft(timeout.clock, TIMEOUT_MINUTES, now) <= 0
  ) {
    next = {
      ...next,
      timeout: { ...timeout, clock: { ...timeout.clock, rang: true } },
    };
    ends.push({ kind: 'timeout', team: timeout.team });
  }

  if (
    next.phase === 'half' &&
    timeLeft(next.clock, next.halfMinutes, now) <= 0
  ) {
    const finished = next.half;
    next = finishHalf(next, endsAt(next.clock, next.halfMinutes));
    ends.push({ kind: 'half', half: finished });
  }

  if (
    next.phase === 'break' &&
    !next.clock.rang &&
    timeLeft(next.clock, next.breakMinutes, now) <= 0
  ) {
    next = { ...next, clock: { ...next.clock, rang: true } };
    ends.push({ kind: 'break' });
  }

  const played = playTime(next, now);
  if (
    next.exclusions.some(e => !e.rang && e.at + e.minutes * 60_000 <= played)
  ) {
    next = {
      ...next,
      exclusions: next.exclusions.map(e => {
        if (e.rang || e.at + e.minutes * 60_000 > played) return e;
        ends.push({ kind: 'exclusion', team: e.team, number: e.number });
        return { ...e, rang: true };
      }),
    };
  }

  return { match: next, ends };
}

/** Le coup d'envoi d'une mi-temps : avant le match, ou pendant la pause. */
export function startHalf(match: Match, now: number): Match {
  if (match.phase !== 'ready' && match.phase !== 'break') return match;
  return {
    ...match,
    phase: 'half',
    clock: freshClock(now),
    timeouts: zero(),
    timeout: null,
  };
}

export function pause(match: Match, now: number): Match {
  if (match.phase !== 'half') return match;
  const clock = pauseClock(match.clock, now);
  return clock === match.clock ? match : { ...match, clock };
}

/** Le jeu reprend : le chrono repart, et un temps mort en cours s'achève. */
export function resume(match: Match, now: number): Match {
  if (match.phase !== 'half') return match;
  const clock = resumeClock(match.clock, now);
  if (clock === match.clock && match.timeout === null) return match;
  return { ...match, clock, timeout: null };
}

/** Siffler la fin avant le chrono : le temps couru est le temps joué. */
export const endHalf = (match: Match, now: number): Match =>
  match.phase === 'half' ? finishHalf(match, now) : match;

/** Un temps mort : le chrono s'arrête, la minute part. */
export function callTimeout(match: Match, team: Team, now: number): Match {
  if (match.phase !== 'half' || match.timeout !== null) return match;
  return {
    ...match,
    clock: pauseClock(match.clock, now),
    timeout: { team, clock: freshClock(now) },
    timeouts: { ...match.timeouts, [team]: match.timeouts[team] + 1 },
  };
}

/** Un but de plus, ou de moins ; jamais sous zéro. */
export function addGoal(match: Match, team: Team, delta: 1 | -1): Match {
  const goals = Math.max(0, match.score[team] + delta);
  return goals === match.score[team]
    ? match
    : { ...match, score: { ...match.score, [team]: goals } };
}

export interface ExclusionInput {
  id: string;
  team: Team;
  number: number;
  minutes: number;
}

/** Une exclusion part du temps de jeu couru, pas de l'heure. */
export function exclude(
  match: Match,
  input: ExclusionInput,
  now: number
): Match {
  if (
    match.phase === 'over' ||
    match.exclusions.length >= MATCH_LIMITS.exclusions
  ) {
    return match;
  }
  // Un numéro hors des bonnets, une durée nulle : refusés sans bruit.
  const exclusion = exclusionSchema.safeParse({
    ...input,
    at: playTime(match, now),
    rang: false,
  });
  return exclusion.success
    ? { ...match, exclusions: [...match.exclusions, exclusion.data] }
    : match;
}

export const unexclude = (match: Match, id: string): Match =>
  match.exclusions.some(e => e.id === id)
    ? { ...match, exclusions: match.exclusions.filter(e => e.id !== id) }
    : match;

/** Remet une exclusion retirée à sa place (« Annuler »). */
export function restoreExclusion(
  match: Match,
  exclusion: Exclusion,
  index: number
): Match {
  if (match.exclusions.some(e => e.id === exclusion.id)) return match;
  const exclusions = [...match.exclusions];
  exclusions.splice(index, 0, exclusion);
  return { ...match, exclusions };
}

const bounded = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, Math.round(value)));

/** Les durées se règlent avant le coup d'envoi, pas pendant le match. */
export function setSettings(
  match: Match,
  patch: Partial<MatchSettings>
): Match {
  if (match.phase !== 'ready') return match;
  const next = { ...match };
  if (patch.halfMinutes !== undefined && Number.isFinite(patch.halfMinutes)) {
    next.halfMinutes = bounded(patch.halfMinutes, MATCH_LIMITS.halfMinutes);
  }
  if (patch.breakMinutes !== undefined && Number.isFinite(patch.breakMinutes)) {
    next.breakMinutes = bounded(patch.breakMinutes, MATCH_LIMITS.breakMinutes);
  }
  return next.halfMinutes === match.halfMinutes &&
    next.breakMinutes === match.breakMinutes
    ? match
    : next;
}
