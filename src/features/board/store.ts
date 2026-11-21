import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { formationSlots, type Formation } from './formations.ts';
import { situationStep, type Situation } from './situations.ts';
import { settleTactic } from './carry.ts';
import { mapCurves, settleCurves } from './curve.ts';
import {
  clamp,
  clampFor,
  createTactic,
  DEFAULT_PITCH,
  distance,
  isSubstitute,
  kickoffStep,
  MAX_ARROWS,
  MAX_PLAYERS,
  MAX_SUBSTITUTES,
  migrateTactic,
  normalizeAngle,
  PITCH_LIMITS,
  pitchSchema,
  PUCK_ID,
  refereeId,
  STEP_DURATION,
  TACTIC_VERSION,
  tacticSchema,
  visiblePlayers,
  type Arrow,
  type Decision,
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
/** Combien de gestes on peut défaire. */
export const HISTORY_LIMIT = 60;
/**
 * Deux gestes du même genre sur le même jeton, à moins de ce délai, n'en font
 * qu'un à défaire : un glisser émet soixante déplacements par seconde, et
 * « Annuler » doit ramener le joueur où il était avant le glisser, pas un
 * pixel en arrière.
 */
export const COALESCE_MS = 700;
/**
 * EN DIRECT, une pause plus longue que ceci, et le prochain glisser ouvre
 * l'étape suivante. Plus court, il rejoint l'étape en cours : on déplace deux
 * ou trois joueurs à la suite, et ils bougent « ensemble » (ADR 0025).
 */
export const RECORD_PAUSE_MS = 1200;

export interface BoardState {
  /** Le schéma en cours d'édition — le brouillon, persisté sur l'appareil. */
  tactic: Tactic;
  /** L'étape éditée. */
  step: number;
  /** La tête de lecture : un réel, égal à `step` à l'arrêt. */
  playhead: number;
  playing: boolean;
  /**
   * L'ENREGISTREMENT EN DIRECT (ADR 0025) : chaque glisser, après une pause,
   * ouvre une étape nouvelle — on raconte l'action au lieu de la découper.
   */
  recording: boolean;
  speed: Speed;
  /** Le jeton sélectionné en premier (joueur, arbitre ou palet). */
  selected: string | null;
  /** Les autres jetons de la sélection, quand elle est multiple. */
  extra: string[];
  /** Les états d'avant, pour « Annuler ». */
  past: Tactic[];
  /** Les états défaits, pour « Rétablir ». */
  future: Tactic[];

  /** `additive` : ajoute ou retire de la sélection au lieu de la remplacer. */
  select: (id: string | null, additive?: boolean) => void;
  /** Sélectionne les joueurs dans l'eau d'une équipe. */
  selectTeam: (team: Team) => void;
  move: (id: string, point: Point) => void;
  rotate: (id: string, angle: number) => void;
  /** Tourne toute la sélection autour de son centre, de `delta` degrés. */
  rotateSelection: (delta: number) => void;
  setSurface: (id: string, surface: boolean) => void;
  /**
   * Donne le palet à un joueur, qui descend au fond s'il n'y est pas ; `null`
   * le lâche. Le palet suit ensuite sa crosse (`carry.ts`).
   */
  setCarrier: (id: string | null) => void;
  /** L'apnée propre d'un joueur, en secondes ; `null` reprend le seuil. */
  setApnea: (id: string, seconds: number | null) => void;
  /** L'arrêt de jeu de l'étape courante ; `null` le retire. */
  setDecision: (decision: Decision | null) => void;
  /**
   * Place les arbitres de l'eau autour du palet : deux de part et d'autre,
   * face à lui, le troisième en retrait côté large.
   */
  followPuck: () => void;
  rename: (id: string, name: string) => void;
  setLeftHanded: (id: string, value: boolean) => void;
  setCount: (kind: Team | 'referees', count: number) => void;
  setSubstitutes: (team: Team, count: number) => void;
  setDeckReferee: (shown: boolean) => void;
  /**
   * Place les six joueurs d'une équipe selon une composition, sur l'étape
   * courante ; `names` renomme au passage (les postes, s'ils sont demandés).
   */
  applyFormation: (
    team: Team,
    formation: Formation,
    names?: Record<string, string>
  ) => void;
  /** Replace l'étape courante selon une situation du règlement. */
  applySituation: (situation: Situation) => void;
  /** Un remplaçant prend la place d'un joueur, qui part dans la zone. */
  substitute: (fieldId: string, substituteId: string) => void;
  addArrow: (arrow: Arrow) => void;
  removeArrow: (index: number) => void;
  /**
   * Courbe la nage d'un joueur depuis l'étape précédente jusqu'à l'étape
   * courante (`curve.ts`) : le point de contrôle, en mètres ; `null` la
   * redresse.
   */
  setCurve: (id: string, control: Point | null) => void;
  setDuration: (seconds: number) => void;
  setDisplay: (patch: Partial<Display>) => void;
  setPitch: (patch: Partial<Pitch>) => void;
  setName: (name: string) => void;
  setNote: (note: string) => void;
  goTo: (step: number) => void;
  addStep: () => void;
  removeStep: () => void;
  /**
   * Recopie la position des jetons sélectionnés (palet compris) de l'étape
   * courante sur toutes les suivantes.
   */
  carryForward: () => void;
  /**
   * Retourne la phase entière, côté gauche ↔ côté droit : les joueurs dans
   * l'eau, le palet et les flèches. Officiels et remplaçants restent à leur
   * place — la plage et les zones de remplacement ne changent pas de côté.
   */
  mirror: () => void;
  /** Échange l'étape courante avec sa voisine : avant (−1) ou après (+1). */
  moveStep: (delta: -1 | 1) => void;
  resetToKickoff: () => void;
  undo: () => void;
  redo: () => void;
  play: () => void;
  pause: () => void;
  setRecording: (on: boolean) => void;
  /**
   * Un glisser commence vraiment (au-delà du tremblement d'un toucher). En
   * direct, après une pause, il ouvre l'étape suivante avant de bouger.
   */
  recordGestureStart: () => void;
  /** Le glisser est fini : la pause qui ouvrira l'étape suivante commence. */
  recordGestureEnd: () => void;
  /** Avance la lecture de `seconds` secondes. */
  tick: (seconds: number) => void;
  setSpeed: (speed: Speed) => void;
  /** Remplace le brouillon (un schéma ouvert, un lien partagé). */
  load: (tactic: Tactic) => void;
  /**
   * Un schéma vierge, à l'engagement. `lite` : six contre six et le palet,
   * ni remplaçants ni arbitres — le départ du mode simple (ADR 0020).
   */
  reset: (options?: { lite?: boolean }) => void;
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

/**
 * Une coordonnée suit le terrain qui change de taille : proportionnelle
 * dedans, à distance constante du bord dehors. Un joueur contre son mur y
 * reste, un remplaçant reste dans sa zone, l'arbitre de bord sur la plage.
 */
function rescaleAxis(value: number, before: number, after: number): number {
  if (value <= 0) return value;
  if (value >= before) return after + (value - before);
  return (value * after) / before;
}

function rescale(tactic: Tactic, before: Pitch): Tactic {
  const { length, width } = tactic.pitch;
  if (length === before.length && width === before.width) return tactic;
  const move = <T extends Point>(p: T): T => ({
    ...p,
    x: rescaleAxis(p.x, before.length, length),
    y: rescaleAxis(p.y, before.width, width),
  });
  return {
    ...tactic,
    steps: tactic.steps.map(step => ({
      ...mapCurves(step, move),
      puck: move(step.puck),
      arrows: step.arrows.map(a => ({
        ...a,
        from: move(a.from),
        to: move(a.to),
      })),
      poses: Object.fromEntries(
        Object.entries(step.poses).map(([id, pose]) => [id, move(pose)])
      ),
    })),
  };
}

/** Ramène toutes les positions de toutes les étapes à leur place permise. */
function clampAll(tactic: Tactic): Tactic {
  return {
    ...tactic,
    steps: tactic.steps.map(step => ({
      ...step,
      puck: clampFor(PUCK_ID, step.puck, tactic.pitch),
      poses: Object.fromEntries(
        Object.entries(step.poses).map(([id, pose]) => [
          id,
          { ...pose, ...clampFor(id, pose, tactic.pitch) },
        ])
      ),
    })),
  };
}

/**
 * LE DÉPART DU MODE SIMPLE : six contre six et le palet. Les remplaçants et
 * les arbitres existent toujours dans le schéma, masqués — le mode complet
 * les fait paraître d'un réglage.
 */
function liteIf(lite: boolean, tactic: Tactic): Tactic {
  if (!lite) return tactic;
  return {
    ...tactic,
    counts: {
      ...tactic.counts,
      substitutes: { blanc: 0, noir: 0 },
      referees: 0,
      deckReferee: false,
    },
  };
}

/** Une passe ou un flick tracé à moins de ce rayon du palet en part. */
const PUCK_SNAP = 1.5;

/**
 * L'écart des arbitres de l'eau au palet, quand ils le suivent : assez près
 * pour le voir à travers 2 à 3,65 m d'eau, assez loin pour ne pas gêner.
 */
export const REFEREE_GAP = 3.5;

/** Où est un jeton (joueur, arbitre ou palet) à une étape. */
function pointOf(step: Step, id: string): Point | undefined {
  return id === PUCK_ID ? step.puck : step.poses[id];
}

export interface BoardStoreOptions {
  /** Le bassin d'un schéma neuf ; le bassin réglementaire par défaut. */
  newPitch?: () => Pitch;
}

export function createBoardStore(
  initial: Tactic,
  options: BoardStoreOptions = {}
): BoardStore {
  const newPitch = options.newPitch ?? (() => ({ ...DEFAULT_PITCH }));
  return createStore<BoardState>()((set, get) => {
    /** Le dernier geste enregistré, pour regrouper un glisser en un seul. */
    let last: { key: string; at: number } | null = null;

    /**
     * TOUTE ÉDITION PASSE ICI : elle arrête la lecture, se fait sur l'étape
     * courante, et laisse de quoi la défaire. Éditer pendant qu'une phase
     * défile reviendrait à déplacer un joueur entre deux étapes — une
     * position qui n'existe dans aucune.
     */
    const edit = (
      key: string,
      change: (state: BoardState) => Partial<BoardState>
    ) =>
      set(state => {
        const next = change(state);
        // LE PALET RESTE AU FOND, avec son porteur : toute édition repasse
        // par la règle (`carry.ts`) ; une nage courbe n'existe que pour un
        // joueur qui bouge (`curve.ts`).
        if (next.tactic) next.tactic = settleCurves(settleTactic(next.tactic));
        const base = { playing: false, playhead: state.step, ...next };
        if (!next.tactic || next.tactic === state.tactic) return base;
        const at = Date.now();
        const merge =
          last !== null && last.key === key && at - last.at < COALESCE_MS;
        last = { key, at };
        if (merge) return base;
        return {
          ...base,
          past: [...state.past, state.tactic].slice(-HISTORY_LIMIT),
          future: [],
        };
      });

    // En direct : une étape a-t-elle déjà été ouverte, et quand le dernier
    // glisser s'est-il terminé ? Hors de l'état : rien à dessiner.
    let recordOpened = false;
    let recordEndedAt = 0;

    /** Les jetons de la sélection, le premier compris. */
    const selection = (state: BoardState) =>
      state.selected ? [state.selected, ...state.extra] : [];

    return {
      tactic: initial,
      step: 0,
      playhead: 0,
      playing: false,
      recording: false,
      speed: 1,
      selected: null,
      extra: [],
      past: [],
      future: [],

      select: (id, additive = false) =>
        set(state => {
          if (id === null) return { selected: null, extra: [] };
          if (!additive) {
            // Un clic sur un jeton déjà dans la sélection la garde entière :
            // c'est le début d'un glisser de groupe.
            if (selection(state).includes(id)) return {};
            return { selected: id, extra: [] };
          }
          const current = selection(state);
          const next = current.includes(id)
            ? current.filter(x => x !== id)
            : [...current, id];
          return { selected: next[0] ?? null, extra: next.slice(1) };
        }),

      selectTeam: team =>
        set(({ tactic }) => {
          const ids = visiblePlayers(tactic)
            .filter(p => p.team === team && !isSubstitute(p))
            .map(p => p.id);
          return { selected: ids[0] ?? null, extra: ids.slice(1) };
        }),

      /**
       * UN DÉPLACEMENT DE GROUPE : quand le jeton fait partie d'une sélection
       * multiple, tous bougent du même écart — chacun ramené ensuite à sa
       * place permise.
       */
      move: (id, point) =>
        edit(`move:${id}`, state => {
          const { tactic, step } = state;
          const current = tactic.steps[step]!;
          const origin = pointOf(current, id);
          if (!origin) return {};
          const group = selection(state);
          const ids = group.includes(id) && group.length > 1 ? group : [id];
          const dx = point.x - origin.x;
          const dy = point.y - origin.y;
          const next = editStep(tactic, step, s => {
            const poses = { ...s.poses };
            let puck = s.puck;
            for (const target of ids) {
              const from = pointOf(s, target);
              if (!from) continue;
              const to = clampFor(
                target,
                { x: from.x + dx, y: from.y + dy },
                tactic.pitch
              );
              if (target === PUCK_ID) puck = to;
              else poses[target] = { ...poses[target]!, ...to };
            }
            // LE PALET DÉPLACÉ SANS SON PORTEUR est lâché : on le redonne
            // d'un geste (« Donner le palet »), jamais en le posant près
            // d'une crosse — un placement voulu ne doit pas sauter.
            if (
              ids.includes(PUCK_ID) &&
              !(s.carrier && ids.includes(s.carrier))
            ) {
              const { carrier: _was, ...rest } = s;
              return { ...rest, poses, puck };
            }
            return { ...s, poses, puck };
          });
          return { tactic: next };
        }),

      rotate: (id, angle) =>
        edit(`rotate:${id}`, ({ tactic, step }) => ({
          tactic: editPose(tactic, step, id, pose => ({
            ...pose,
            angle: normalizeAngle(Math.round(angle)),
          })),
        })),

      rotateSelection: delta =>
        edit('rotate-group', state => {
          const ids = selection(state).filter(id => id !== PUCK_ID);
          const { tactic, step } = state;
          const current = tactic.steps[step]!;
          const points = ids
            .map(id => current.poses[id])
            .filter((p): p is Pose => Boolean(p));
          if (points.length === 0) return {};
          const cx = points.reduce((a, p) => a + p.x, 0) / points.length;
          const cy = points.reduce((a, p) => a + p.y, 0) / points.length;
          const r = (delta * Math.PI) / 180;
          const next = editStep(tactic, step, s => {
            const poses = { ...s.poses };
            for (const id of ids) {
              const p = poses[id];
              if (!p) continue;
              const x =
                cx + (p.x - cx) * Math.cos(r) - (p.y - cy) * Math.sin(r);
              const y =
                cy + (p.x - cx) * Math.sin(r) + (p.y - cy) * Math.cos(r);
              poses[id] = {
                ...p,
                ...clampFor(id, { x, y }, tactic.pitch),
                angle: normalizeAngle(Math.round(p.angle + delta)),
              };
            }
            return { ...s, poses };
          });
          return { tactic: next };
        }),

      setSurface: (id, surface) =>
        edit(`surface:${id}`, ({ tactic, step }) => ({
          tactic: editPose(tactic, step, id, pose =>
            pose.surface === undefined ? pose : { ...pose, surface }
          ),
        })),

      setCarrier: id =>
        edit(`carrier:${id ?? 'aucun'}`, ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => {
            const { carrier: _was, ...rest } = s;
            if (!id) return rest;
            const pose = s.poses[id];
            if (!pose || pose.surface === undefined) return rest;
            return {
              ...rest,
              carrier: id,
              poses: { ...s.poses, [id]: { ...pose, surface: false } },
            };
          }),
        })),

      setApnea: (id, seconds) =>
        edit(`apnea:${id}`, ({ tactic }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            roster: {
              ...tactic.roster,
              players: tactic.roster.players.map(p => {
                if (p.id !== id) return p;
                const { apnea: _was, ...rest } = p;
                return seconds === null
                  ? rest
                  : { ...rest, apnea: clamp(Math.round(seconds), 5, 60) };
              }),
            },
          },
        })),

      setDecision: decision =>
        edit('decision', ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => {
            const { decision: _was, ...rest } = s;
            return decision ? { ...rest, decision } : rest;
          }),
        })),

      followPuck: () =>
        edit('arbitres-palet', ({ tactic, step }) => {
          const count = tactic.counts.referees;
          if (count === 0) return {};
          const { puck } = tactic.steps[step]!;
          const { length } = tactic.pitch;
          // Le troisième se met en retrait du côté où il y a le plus d'eau.
          const back = puck.x < length / 2 ? 1 : -1;
          const spots: [number, number, number][] = [
            [puck.x, puck.y - REFEREE_GAP, 90],
            [puck.x, puck.y + REFEREE_GAP, -90],
            [puck.x + back * REFEREE_GAP, puck.y, back === 1 ? 180 : 0],
          ];
          return {
            tactic: editStep(tactic, step, s => {
              const poses = { ...s.poses };
              spots.slice(0, count).forEach(([x, y, angle], i) => {
                const id = refereeId(i + 1);
                const pose = poses[id];
                if (!pose) return;
                poses[id] = {
                  ...pose,
                  ...clampFor(id, { x, y }, tactic.pitch),
                  angle: normalizeAngle(angle),
                };
              });
              return { ...s, poses };
            }),
          };
        }),

      rename: (id, name) =>
        edit(`rename:${id}`, ({ tactic }) => ({
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
        edit(`hand:${id}`, ({ tactic }) => ({
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
        edit(`count:${kind}`, ({ tactic, selected }) => {
          const counts =
            kind === 'referees'
              ? {
                  ...tactic.counts,
                  referees: ([0, 2, 3] as const).includes(count as RefereeCount)
                    ? (count as RefereeCount)
                    : tactic.counts.referees,
                }
              : {
                  ...tactic.counts,
                  [kind]: clamp(Math.round(count), 0, MAX_PLAYERS),
                };
          return {
            tactic: { ...tactic, updatedAt: now(), counts },
            // Un jeton masqué ne reste pas sélectionné.
            selected: selected === PUCK_ID ? selected : null,
            extra: [],
          };
        }),

      setSubstitutes: (team, count) =>
        edit(`subs:${team}`, ({ tactic, selected }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            counts: {
              ...tactic.counts,
              substitutes: {
                ...tactic.counts.substitutes,
                [team]: clamp(Math.round(count), 0, MAX_SUBSTITUTES),
              },
            },
          },
          selected: selected === PUCK_ID ? selected : null,
          extra: [],
        })),

      setDeckReferee: shown =>
        edit('deck', ({ tactic, selected }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            counts: { ...tactic.counts, deckReferee: shown },
          },
          selected: selected === PUCK_ID ? selected : null,
          extra: [],
        })),

      applyFormation: (team, formation, names) =>
        edit(`formation:${Date.now()}`, ({ tactic, step }) => {
          const current = tactic.steps[step]!;
          const slots = formationSlots(
            formation,
            team,
            tactic.pitch,
            id => current.poses[id]?.surface
          );
          const poses = { ...current.poses };
          for (const slot of slots) poses[slot.id] = slot.pose;
          const steps = tactic.steps.map((s, i) =>
            i === step ? { ...s, poses } : s
          );
          const players = names
            ? tactic.roster.players.map(p =>
                names[p.id] === undefined
                  ? p
                  : { ...p, name: names[p.id]!.slice(0, 24) }
              )
            : tactic.roster.players;
          return {
            tactic: {
              ...tactic,
              updatedAt: now(),
              steps,
              roster: { ...tactic.roster, players },
            },
          };
        }),

      applySituation: situation =>
        edit(`situation:${Date.now()}`, ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s =>
            situationStep(situation, s, tactic.pitch)
          ),
          selected: null,
          extra: [],
        })),

      /**
       * LE REMPLAÇANT PREND LA PLACE, le joueur prend celle du remplaçant :
       * c'est une entrée par la zone de remplacement, pas une téléportation.
       */
      substitute: (fieldId, substituteId) =>
        edit(`substitute:${Date.now()}`, ({ tactic, step }) => {
          const current = tactic.steps[step]!;
          const a = current.poses[fieldId];
          const b = current.poses[substituteId];
          if (!a || !b) return {};
          return {
            tactic: editStep(tactic, step, s => ({
              ...s,
              poses: { ...s.poses, [fieldId]: b, [substituteId]: a },
            })),
            selected: substituteId,
            extra: [],
          };
        }),

      addArrow: arrow =>
        edit(`arrow:${Date.now()}`, ({ tactic, step }) => {
          const current = tactic.steps[step]!;
          if (current.arrows.length >= MAX_ARROWS) return {};
          const clampArrow = (p: Point) => clampFor('', p, tactic.pitch);
          // UNE PASSE OU UN FLICK PART DU PALET — donc de la crosse de son
          // porteur — quand on la trace tout près de lui.
          if (
            arrow.kind !== 'move' &&
            distance(arrow.from, current.puck) < PUCK_SNAP
          ) {
            arrow = { ...arrow, from: current.puck };
          }
          return {
            tactic: editStep(tactic, step, s => ({
              ...s,
              arrows: [
                ...s.arrows,
                {
                  ...arrow,
                  from: clampArrow(arrow.from),
                  to: clampArrow(arrow.to),
                },
              ],
            })),
          };
        }),

      removeArrow: index =>
        edit(`arrow-remove:${Date.now()}`, ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...s,
            arrows: s.arrows.filter((_, i) => i !== index),
          })),
        })),

      // Un glisser de la poignée émet soixante courbes par seconde : la même
      // clé les regroupe en un seul geste à défaire.
      setCurve: (id, control) =>
        edit(`curve:${id}`, ({ tactic, step }) => {
          const current = tactic.steps[step]!;
          if (step === 0 || (!control && !current.curves?.[id])) return {};
          if (!tactic.roster.players.some(p => p.id === id)) return {};
          return {
            tactic: editStep(tactic, step, s => {
              const { curves: before, ...rest } = s;
              const { [id]: _was, ...others } = before ?? {};
              const curves = control ? { ...others, [id]: control } : others;
              return Object.keys(curves).length > 0
                ? { ...rest, curves }
                : rest;
            }),
          };
        }),

      setDuration: seconds =>
        edit('duration', ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...s,
            duration: clamp(
              Number.isFinite(seconds) ? Math.round(seconds) : s.duration,
              STEP_DURATION.min,
              STEP_DURATION.max
            ),
          })),
        })),

      setDisplay: patch =>
        edit(`display:${Object.keys(patch).join()}`, ({ tactic }) => ({
          tactic: {
            ...tactic,
            updatedAt: now(),
            display: { ...tactic.display, ...patch },
          },
        })),

      setPitch: patch =>
        edit('pitch', ({ tactic }) => {
          const pitch = { ...tactic.pitch, ...patch };
          for (const key of ['length', 'width', 'depth'] as const) {
            pitch[key] = clamp(
              Number.isFinite(pitch[key]) ? pitch[key] : tactic.pitch[key],
              PITCH_LIMITS[key].min,
              PITCH_LIMITS[key].max
            );
          }
          return {
            tactic: clampAll(
              rescale({ ...tactic, updatedAt: now(), pitch }, tactic.pitch)
            ),
          };
        }),

      setName: name =>
        edit('name', ({ tactic }) => ({
          tactic: { ...tactic, updatedAt: now(), name: name.slice(0, 60) },
        })),

      setNote: note =>
        edit('note', ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...s,
            note: note.slice(0, 280),
          })),
        })),

      goTo: index =>
        set(({ tactic }) => {
          const step = clamp(Math.round(index), 0, tactic.steps.length - 1);
          return { step, playhead: step, playing: false };
        }),

      /**
       * UNE ÉTAPE NAÎT COPIE DE LA COURANTE, juste après elle : on ne décrit
       * pas une phase de jeu en replaçant tout le monde, on déplace ceux qui
       * bougent. Les flèches, elles, restent à l'étape qui les porte.
       */
      addStep: () =>
        edit(`step-add:${Date.now()}`, ({ tactic, step }) => {
          if (tactic.steps.length >= MAX_STEPS) return {};
          const copy = structuredClone(tactic.steps[step]!);
          copy.note = '';
          copy.arrows = [];
          const steps = [...tactic.steps];
          steps.splice(step + 1, 0, copy);
          return {
            tactic: { ...tactic, updatedAt: now(), steps },
            step: step + 1,
            playhead: step + 1,
          };
        }),

      carryForward: () =>
        edit(`carry:${Date.now()}`, ({ tactic, step, selected, extra }) => {
          const ids = selected ? [selected, ...extra] : [];
          if (ids.length === 0 || step >= tactic.steps.length - 1) return {};
          const from = tactic.steps[step]!;
          const steps = tactic.steps.map((s, i) => {
            if (i <= step) return s;
            const poses = { ...s.poses };
            for (const id of ids) {
              const pose = from.poses[id];
              if (pose && poses[id]) poses[id] = { ...pose };
            }
            return {
              ...s,
              poses,
              puck: ids.includes(PUCK_ID) ? { ...from.puck } : s.puck,
            };
          });
          return { tactic: { ...tactic, updatedAt: now(), steps } };
        }),

      mirror: () =>
        edit(`mirror:${Date.now()}`, ({ tactic }) => {
          const width = tactic.pitch.width;
          const flip = (p: Point): Point => ({ x: p.x, y: width - p.y });
          const moving = new Set(
            tactic.roster.players.filter(p => !isSubstitute(p)).map(p => p.id)
          );
          const steps = tactic.steps.map(s => ({
            // Les courbes des joueurs retournés se retournent avec eux.
            ...mapCurves(s, (c, id) => (moving.has(id) ? flip(c) : c)),
            puck: flip(s.puck),
            arrows: s.arrows.map(a => ({
              ...a,
              from: flip(a.from),
              to: flip(a.to),
            })),
            poses: Object.fromEntries(
              Object.entries(s.poses).map(([id, pose]) =>
                moving.has(id)
                  ? [
                      id,
                      {
                        ...pose,
                        ...flip(pose),
                        angle: normalizeAngle(-pose.angle),
                      },
                    ]
                  : [id, pose]
              )
            ),
          }));
          return { tactic: { ...tactic, updatedAt: now(), steps } };
        }),

      moveStep: delta =>
        edit(`step-move:${Date.now()}`, ({ tactic, step }) => {
          const target = step + delta;
          if (target < 0 || target >= tactic.steps.length) return {};
          const steps = [...tactic.steps];
          [steps[step], steps[target]] = [steps[target]!, steps[step]!];
          return {
            tactic: { ...tactic, updatedAt: now(), steps },
            step: target,
            playhead: target,
          };
        }),

      removeStep: () =>
        edit(`step-remove:${Date.now()}`, ({ tactic, step }) => {
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
        edit(`kickoff:${Date.now()}`, ({ tactic, step }) => ({
          tactic: editStep(tactic, step, s => ({
            ...kickoffStep(tactic.pitch),
            note: s.note,
            duration: s.duration,
          })),
        })),

      undo: () =>
        set(state => {
          const previous = state.past[state.past.length - 1];
          if (!previous) return {};
          last = null;
          const step = Math.min(state.step, previous.steps.length - 1);
          return {
            tactic: previous,
            past: state.past.slice(0, -1),
            future: [state.tactic, ...state.future].slice(0, HISTORY_LIMIT),
            step,
            playhead: step,
            playing: false,
          };
        }),

      redo: () =>
        set(state => {
          const next = state.future[0];
          if (!next) return {};
          last = null;
          const step = Math.min(state.step, next.steps.length - 1);
          return {
            tactic: next,
            past: [...state.past, state.tactic].slice(-HISTORY_LIMIT),
            future: state.future.slice(1),
            step,
            playhead: step,
            playing: false,
          };
        }),

      play: () => {
        const { tactic, step } = get();
        if (tactic.steps.length < 2) return;
        // Au bout de la phase, « Lire » la rejoue depuis le début.
        const start = step >= tactic.steps.length - 1 ? 0 : step;
        set({
          playing: true,
          // Lire arrête l'enregistrement : on regarde ce qu'on vient de faire.
          recording: false,
          step: start,
          playhead: start,
          selected: null,
          extra: [],
        });
      },

      setRecording: on => {
        recordOpened = false;
        recordEndedAt = 0;
        set(on ? { recording: true, playing: false } : { recording: false });
      },

      recordGestureStart: () => {
        if (!get().recording) return;
        const at = Date.now();
        if (!recordOpened || at - recordEndedAt > RECORD_PAUSE_MS) {
          get().addStep();
          recordOpened = true;
        }
        // Daté dès son début : un geste interrompu sans fin (un second doigt,
        // un pointercancel) ne fige pas la pause pour toujours.
        recordEndedAt = at;
      },

      recordGestureEnd: () => {
        if (get().recording) recordEndedAt = Date.now();
      },

      pause: () =>
        set(state => {
          const step = Math.round(state.playhead);
          return { playing: false, step, playhead: step };
        }),

      tick: seconds =>
        set(state => {
          // LA LECTURE NE RECULE JAMAIS. Un pas nul ou négatif (une horloge
          // qui revient en arrière) est ignoré : depuis la première étape,
          // il menait à l'étape −1, que rien ne sait dessiner.
          if (!state.playing || !(seconds > 0)) return {};
          const end = state.tactic.steps.length - 1;
          const playhead =
            state.playhead + (seconds * state.speed) / SECONDS_PER_STEP;
          if (playhead >= end) {
            return { playing: false, playhead: end, step: end };
          }
          return { playhead, step: Math.floor(playhead) };
        }),

      setSpeed: speed => set({ speed }),

      load: tactic => {
        last = null;
        set({
          tactic: settleCurves(settleTactic(tacticSchema.parse(tactic))),
          step: 0,
          playhead: 0,
          playing: false,
          // Un autre schéma s'ouvre : l'enregistrement de l'ancien s'arrête.
          recording: false,
          selected: null,
          extra: [],
          past: [],
          future: [],
        });
      },

      reset: options =>
        edit(`reset:${Date.now()}`, () => ({
          tactic: liteIf(
            options?.lite === true,
            createTactic({
              id: createUuid(),
              name: '',
              pitch: newPitch(),
            })
          ),
          step: 0,
          playhead: 0,
          recording: false,
          selected: null,
          extra: [],
        })),
    };
  });
}

/**
 * LE BROUILLON SURVIT AU RECHARGEMENT. Un entraîneur qui place douze joueurs
 * au bord du bassin ne doit pas tout perdre parce que le téléphone a mis
 * l'onglet en veille. Clé préfixée par l'identifiant de l'app : toutes les
 * apps du parc partagent la même origine, donc le même `localStorage`.
 */
/**
 * LE BASSIN DU CLUB. Un entraîneur s'entraîne presque toujours dans la même
 * piscine — 21 × 12 m sur 2,20 m, pas les 25 × 15 du règlement. Retenu une
 * fois depuis l'onglet « Bassin », il sert à chaque schéma neuf. Clé
 * préfixée, comme le brouillon : le parc partage une origine.
 */
export const defaultPitchStore = createVersionedStore<Pitch>({
  store: 'mister-uwh-tactic',
  key: 'bassin',
  version: 1,
  validate: data => pitchSchema.parse(data),
  seed: () => ({ ...DEFAULT_PITCH }),
});

export const draftStore = createVersionedStore<Tactic>({
  store: 'mister-uwh-tactic',
  key: 'tableau',
  version: TACTIC_VERSION,
  // Toute version antérieure monte d'un coup par `migrateTactic`.
  migrations: { 1: migrateTactic, 2: migrateTactic },
  validate: data => tacticSchema.parse(data),
  seed: () =>
    createTactic({
      id: createUuid(),
      name: '',
      pitch: defaultPitchStore.load(),
    }),
});

export const boardStore = createBoardStore(draftStore.load(), {
  newPitch: () => defaultPitchStore.load(),
});

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
