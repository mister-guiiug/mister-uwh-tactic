import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import {
  clamp,
  clampToPitch,
  createTactic,
  kickoffStep,
  normalizeAngle,
  PITCH_LIMITS,
  PUCK_ID,
  tacticSchema,
  type Display,
  type Pitch,
  type Point,
  type Pose,
  type RefereeCount,
  type Step,
  type Tactic,
  type Team,
} from './model.ts';

/** Durée d'un passage d'une étape à la suivante, à vitesse 1. */
export const SECONDS_PER_STEP = 1.6;
export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];
export const MAX_STEPS = 30;

export interface BoardState {
  /** Le schéma en cours d'édition — le brouillon, persisté sur l'appareil. */
  tactic: Tactic;
  /** L'étape éditée. */
  step: number;
  /** La tête de lecture : un réel, égal à `step` à l'arrêt. */
  playhead: number;
  playing: boolean;
  speed: Speed;
  /** Le jeton sélectionné (joueur, arbitre ou palet). */
  selected: string | null;

  select: (id: string | null) => void;
  move: (id: string, point: Point) => void;
  rotate: (id: string, angle: number) => void;
  setSurface: (id: string, surface: boolean) => void;
  rename: (id: string, name: string) => void;
  setLeftHanded: (id: string, value: boolean) => void;
  setCount: (kind: Team | 'referees', count: number) => void;
  setDisplay: (patch: Partial<Display>) => void;
  setPitch: (patch: Partial<Pitch>) => void;
  setName: (name: string) => void;
  setNote: (note: string) => void;
  goTo: (step: number) => void;
  addStep: () => void;
  removeStep: () => void;
  resetToKickoff: () => void;
  play: () => void;
  pause: () => void;
  /** Avance la lecture de `seconds` secondes. */
  tick: (seconds: number) => void;
  setSpeed: (speed: Speed) => void;
  /** Remplace le brouillon (un schéma ouvert, un lien partagé). */
  load: (tactic: Tactic) => void;
  /** Un schéma vierge, à l'engagement. */
  reset: () => void;
}

export type BoardStore = StoreApi<BoardState>;

const now = () => new Date().toISOString();

/** Le même schéma, l'étape `index` remplacée par ce que rend `edit`. */
function editStep(
  tactic: Tactic,
  index: number,
  edit: (step: Step) => Step
): Tactic {
  return {
    ...tactic,
    updatedAt: now(),
    steps: tactic.steps.map((step, i) => (i === index ? edit(step) : step)),
  };
}

function editPose(
  tactic: Tactic,
  index: number,
  id: string,
  edit: (pose: Pose) => Pose
): Tactic {
  return editStep(tactic, index, step => {
    const pose = step.poses[id];
    if (!pose) return step;
    return { ...step, poses: { ...step.poses, [id]: edit(pose) } };
  });
}

/** Ramène toutes les positions de toutes les étapes dans le terrain. */
function clampAll(tactic: Tactic): Tactic {
  return {
    ...tactic,
    steps: tactic.steps.map(step => ({
      ...step,
      puck: clampToPitch(step.puck, tactic.pitch),
      poses: Object.fromEntries(
        Object.entries(step.poses).map(([id, pose]) => [
          id,
          { ...pose, ...clampToPitch(pose, tactic.pitch) },
        ])
      ),
    })),
  };
}

export function createBoardStore(initial: Tactic): BoardStore {
  return createStore<BoardState>()((set, get) => {
    /**
     * TOUTE ÉDITION ARRÊTE LA LECTURE et se fait sur l'étape courante. Éditer
     * pendant qu'une phase défile reviendrait à déplacer un joueur entre deux
     * étapes — une position qui n'existe dans aucune.
     */
    const edit = (change: (state: BoardState) => Partial<BoardState>) =>
      set(state => ({
        playing: false,
        playhead: state.step,
        ...change(state),
      }));

    return {
      tactic: initial,
      step: 0,
      playhead: 0,
      playing: false,
      speed: 1,
      selected: null,

      select: id => set({ selected: id }),

      move: (id, point) =>
        edit(({ tactic, step }) => {
          const target = clampToPitch(point, tactic.pitch);
          if (id === PUCK_ID) {
            return {
              tactic: editStep(tactic, step, s => ({ ...s, puck: target })),
            };
          }
          return {
            tactic: editPose(tactic, step, id, pose => ({
              ...pose,
              ...target,
            })),
          };
        }),

      rotate: (id, angle) =>
        edit(({ tactic, step }) => ({
          tactic: editPose(tactic, step, id, pose => ({
            ...pose,
            angle: normalizeAngle(Math.round(angle)),
          })),
        })),

      setSurface: (id, surface) =>
        edit(({ tactic, step }) => ({
          tactic: editPose(tactic, step, id, pose =>
            pose.surface === undefined ? pose : { ...pose, surface }
          ),
        })),

      rename: (id, name) =>
        edit(({ tactic }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            roster: {
              players: tactic.roster.players.map(p =>
                p.id === id ? { ...p, name: name.slice(0, 24) } : p
              ),
              referees: tactic.roster.referees.map(r =>
                r.id === id ? { ...r, name: name.slice(0, 24) } : r
              ),
            },
          },
        })),

      setLeftHanded: (id, value) =>
        edit(({ tactic }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            roster: {
              ...tactic.roster,
              players: tactic.roster.players.map(p =>
                p.id === id ? { ...p, leftHanded: value } : p
              ),
            },
          },
        })),

      setCount: (kind, count) =>
        edit(({ tactic, selected }) => {
          const counts =
            kind === 'referees'
              ? {
                  ...tactic.counts,
                  referees: ([0, 2, 3] as const).includes(count as RefereeCount)
                    ? (count as RefereeCount)
                    : tactic.counts.referees,
                }
              : { ...tactic.counts, [kind]: clamp(Math.round(count), 0, 6) };
          return {
            tactic: { ...tactic, updatedAt: now(), counts },
            // Un jeton masqué ne reste pas sélectionné.
            selected: selected === PUCK_ID ? selected : null,
          };
        }),

      setDisplay: patch =>
        set(({ tactic }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            display: { ...tactic.display, ...patch },
          },
        })),

      setPitch: patch =>
        edit(({ tactic }) => {
          const pitch = { ...tactic.pitch, ...patch };
          for (const key of ['length', 'width', 'depth'] as const) {
            pitch[key] = clamp(
              Number.isFinite(pitch[key]) ? pitch[key] : tactic.pitch[key],
              PITCH_LIMITS[key].min,
              PITCH_LIMITS[key].max
            );
          }
          return { tactic: clampAll({ ...tactic, updatedAt: now(), pitch }) };
        }),

      setName: name =>
        set(({ tactic }) => ({
          tactic: { ...tactic, updatedAt: now(), name: name.slice(0, 60) },
        })),

      setNote: note =>
        edit(({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...s,
            note: note.slice(0, 280),
          })),
        })),

      goTo: index =>
        edit(({ tactic }) => {
          const step = clamp(Math.round(index), 0, tactic.steps.length - 1);
          return { step, playhead: step };
        }),

      /**
       * UNE ÉTAPE NAÎT COPIE DE LA COURANTE, juste après elle : on ne décrit
       * pas une phase de jeu en replaçant tout le monde, on déplace ceux qui
       * bougent.
       */
      addStep: () =>
        edit(({ tactic, step }) => {
          if (tactic.steps.length >= MAX_STEPS) return {};
          const copy = structuredClone(tactic.steps[step]!);
          copy.note = '';
          const steps = [...tactic.steps];
          steps.splice(step + 1, 0, copy);
          return {
            tactic: { ...tactic, updatedAt: now(), steps },
            step: step + 1,
            playhead: step + 1,
          };
        }),

      removeStep: () =>
        edit(({ tactic, step }) => {
          if (tactic.steps.length <= 1) return {};
          const steps = tactic.steps.filter((_, i) => i !== step);
          const next = Math.min(step, steps.length - 1);
          return {
            tactic: { ...tactic, updatedAt: now(), steps },
            step: next,
            playhead: next,
          };
        }),

      resetToKickoff: () =>
        edit(({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...kickoffStep(tactic.pitch),
            note: s.note,
          })),
        })),

      play: () => {
        const { tactic, step } = get();
        if (tactic.steps.length < 2) return;
        // Au bout de la phase, « Lire » la rejoue depuis le début.
        const start = step >= tactic.steps.length - 1 ? 0 : step;
        set({ playing: true, step: start, playhead: start, selected: null });
      },

      pause: () =>
        set(state => {
          const step = Math.round(state.playhead);
          return { playing: false, step, playhead: step };
        }),

      tick: seconds =>
        set(state => {
          if (!state.playing) return {};
          const last = state.tactic.steps.length - 1;
          const playhead =
            state.playhead + (seconds * state.speed) / SECONDS_PER_STEP;
          if (playhead >= last) {
            return { playing: false, playhead: last, step: last };
          }
          return { playhead, step: Math.floor(playhead) };
        }),

      setSpeed: speed => set({ speed }),

      load: tactic =>
        set({
          tactic: tacticSchema.parse(tactic),
          step: 0,
          playhead: 0,
          playing: false,
          selected: null,
        }),

      reset: () =>
        set({
          tactic: createTactic({ id: createUuid(), name: '' }),
          step: 0,
          playhead: 0,
          playing: false,
          selected: null,
        }),
    };
  });
}

/**
 * LE BROUILLON SURVIT AU RECHARGEMENT. Un entraîneur qui place douze joueurs
 * au bord du bassin ne doit pas tout perdre parce que le téléphone a mis
 * l'onglet en veille. Clé préfixée par l'identifiant de l'app : toutes les
 * apps du parc partagent la même origine, donc le même `localStorage`.
 */
export const draftStore = createVersionedStore<Tactic>({
  store: 'mister-uwh-tactic',
  key: 'tableau',
  version: 1,
  validate: data => tacticSchema.parse(data),
  seed: () => createTactic({ id: createUuid(), name: '' }),
});

export const boardStore = createBoardStore(draftStore.load());

/**
 * L'écriture est DIFFÉRÉE : un glisser émet soixante déplacements par
 * seconde, et le brouillon n'a besoin que du dernier.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
boardStore.subscribe((state, previous) => {
  if (state.tactic === previous.tactic) return;
  clearTimeout(timer);
  timer = setTimeout(() => draftStore.save(boardStore.getState().tactic), 300);
});

export function useBoard<T>(selector: (state: BoardState) => T): T {
  return useStore(boardStore, selector);
}
