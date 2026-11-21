import { create } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import type { Team } from '../board/model.ts';
import {
  addGoal,
  callTimeout,
  endHalf,
  exclude,
  MATCH_VERSION,
  matchSchema,
  newMatch,
  pause,
  restoreExclusion,
  resume,
  setSettings,
  settle,
  startHalf,
  unexclude,
  type Exclusion,
  type Match,
  type MatchEnd,
  type MatchSettings,
} from './model.ts';

/**
 * LE MATCH SURVIT À UN RECHARGEMENT (ADR 0033) : un magasin versionné du
 * socle, sur l'appareil, sous `mister-uwh-tacticmatch` — préfixe et clé
 * collés, comme l'effectif et le bassin. Un téléphone qui recharge l'onglet
 * au milieu d'une mi-temps reprend le chrono où il en est, parce que le
 * magasin garde des instants : le temps passé pendant le rechargement est
 * compté.
 */
export const matchStore = createVersionedStore<Match>({
  store: 'mister-uwh-tactic',
  key: 'match',
  version: MATCH_VERSION,
  validate: data => matchSchema.parse(data),
  seed: () => newMatch(),
});

/** Des fins relevées, pas encore signalées. */
export interface PendingEnds {
  id: number;
  list: MatchEnd[];
}

interface MatchState {
  match: Match;
  /** Ce qui s'est terminé depuis le dernier signal. Jamais gardé. */
  ends: PendingEnds | null;
  /** Les dernières fins signalées, que l'écran dit ; jamais gardé. */
  said: PendingEnds | null;
  /** Met le match à l'heure : à chaque relevé de l'écran. */
  tick: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  endHalf: () => void;
  timeout: (team: Team) => void;
  goal: (team: Team, delta: 1 | -1) => void;
  exclude: (input: { team: Team; number: number; minutes: number }) => void;
  unexclude: (id: string) => void;
  restoreExclusion: (exclusion: Exclusion, index: number) => void;
  settings: (patch: Partial<MatchSettings>) => void;
  /** Tout le match d'un coup : un nouveau match, ou l'annuler. */
  replace: (match: Match) => void;
  /** Les fins `id` sont signalées : elles ne le seront plus. */
  acknowledge: (id: number) => void;
  /** L'écran se ferme : ce qu'il a dit ne se redira pas à son retour. */
  forget: () => void;
}

let sequence = 0;

/**
 * L'ÉTAT VIVANT DU MATCH (ADR 0002) : Zustand pour l'écran, le magasin
 * versionné pour ce qui survit. Chaque geste commence par mettre le match à
 * l'heure (`settle`) : mettre en pause une mi-temps déjà finie ne la
 * prolonge pas, et la fin relevée au passage est signalée comme une autre.
 * L'écriture n'a lieu que si le match change — pas à chaque seconde.
 */
export const useMatch = create<MatchState>()((set, get) => {
  const apply = (change?: (match: Match, now: number) => Match) => {
    const now = Date.now();
    const before = get().match;
    const settled = settle(before, now);
    const match = change ? change(settled.match, now) : settled.match;
    if (match === before && settled.ends.length === 0) return;
    if (match !== before) matchStore.save(match);
    const pending = get().ends;
    set(
      settled.ends.length === 0
        ? { match }
        : {
            match,
            ends: {
              id: ++sequence,
              list: [...(pending?.list ?? []), ...settled.ends],
            },
          }
    );
  };

  return {
    match: matchStore.load(),
    ends: null,
    said: null,
    tick: () => apply(),
    start: () => apply(startHalf),
    pause: () => apply(pause),
    resume: () => apply(resume),
    endHalf: () => apply(endHalf),
    timeout: team => apply((match, now) => callTimeout(match, team, now)),
    goal: (team, delta) => apply(match => addGoal(match, team, delta)),
    exclude: input =>
      apply((match, now) =>
        exclude(match, { ...input, id: createId('ex') }, now)
      ),
    unexclude: id => apply(match => unexclude(match, id)),
    restoreExclusion: (exclusion, index) =>
      apply(match => restoreExclusion(match, exclusion, index)),
    settings: patch => apply(match => setSettings(match, patch)),
    replace: match => {
      const valid = matchSchema.parse(match);
      matchStore.save(valid);
      set({ match: valid, ends: null, said: null });
    },
    acknowledge: id => {
      const ends = get().ends;
      if (ends?.id === id) set({ ends: null, said: ends });
    },
    forget: () => set({ said: null }),
  };
});
