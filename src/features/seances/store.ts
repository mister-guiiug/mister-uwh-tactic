import { create } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import {
  SEANCE_LIMITS,
  createSeance,
  moveItem,
  seancesSnapshotSchema,
  type Seance,
  type SeanceItem,
  type SeancesSnapshot,
} from './model.ts';

/**
 * LES SÉANCES, SUR L'APPAREIL (ADR 0018). Même espace et même magasin
 * versionné que les schémas : enveloppe `{ v, data }`, copie de côté avant
 * toute perte. Elles ne suivent pas encore le compte — une séance se prépare
 * et se joue sur la tablette du bord du bassin.
 */
export const seancesStore = createVersionedStore<SeancesSnapshot>({
  store: 'mister-uwh-tactic',
  key: 'seances',
  version: 1,
  validate: (data: unknown) => seancesSnapshotSchema.parse(data),
  seed: (): SeancesSnapshot => ({ seances: [] }),
});

interface SeancesState {
  seances: Seance[];
  /** Relit le magasin : au montage de l'écran, après un import. */
  load: () => void;
  create: (id: string, name?: string) => Seance;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addItem: (id: string, schemaId: string) => void;
  removeItem: (id: string, index: number) => void;
  moveItem: (id: string, from: number, to: number) => void;
  updateItem: (id: string, index: number, patch: Partial<SeanceItem>) => void;
}

const byRecent = (a: Seance, b: Seance) =>
  b.updatedAt.localeCompare(a.updatedAt);

export const useSeances = create<SeancesState>()((set, get) => {
  /** Écrit, puis montre : l'écran ne montre que ce qui est enregistré. */
  const commit = (seances: Seance[]) => {
    const sorted = [...seances].sort(byRecent);
    seancesStore.save({ seances: sorted });
    set({ seances: sorted });
  };
  const change = (id: string, edit: (seance: Seance) => Seance) =>
    commit(
      get().seances.map(seance =>
        seance.id === id
          ? { ...edit(seance), updatedAt: new Date().toISOString() }
          : seance
      )
    );

  return {
    seances: [...seancesStore.load().seances].sort(byRecent),
    load: () =>
      set({ seances: [...seancesStore.load().seances].sort(byRecent) }),
    create: (id, name = '') => {
      const seance = createSeance(id, name);
      commit([seance, ...get().seances]);
      return seance;
    },
    rename: (id, name) =>
      change(id, seance => ({
        ...seance,
        name: name.slice(0, SEANCE_LIMITS.name),
      })),
    remove: id => commit(get().seances.filter(seance => seance.id !== id)),
    addItem: (id, schemaId) =>
      change(id, seance =>
        seance.items.length >= SEANCE_LIMITS.items
          ? seance
          : {
              ...seance,
              items: [
                ...seance.items,
                { schemaId, minutes: SEANCE_LIMITS.minutes.default, note: '' },
              ],
            }
      ),
    removeItem: (id, index) =>
      change(id, seance => ({
        ...seance,
        items: seance.items.filter((_, i) => i !== index),
      })),
    moveItem: (id, from, to) =>
      change(id, seance => ({
        ...seance,
        items: moveItem(seance.items, from, to),
      })),
    updateItem: (id, index, patch) =>
      change(id, seance => ({
        ...seance,
        items: seance.items.map((item, i) => {
          if (i !== index) return item;
          const minutes = Math.round(patch.minutes ?? item.minutes);
          return {
            ...item,
            ...patch,
            minutes: Math.min(
              SEANCE_LIMITS.minutes.max,
              Math.max(SEANCE_LIMITS.minutes.min, minutes)
            ),
            note: (patch.note ?? item.note).slice(0, SEANCE_LIMITS.note),
          };
        }),
      })),
  };
});

/**
 * LA SÉANCE EN COURS DE PRÉSENTATION : laquelle, et à quelle phase. Le
 * tableau la lit pour offrir « Phase suivante » dans sa barre de
 * présentation ; elle s'efface quand la présentation s'arrête.
 */
interface PlayState {
  seanceId: string | null;
  index: number;
  start: (seanceId: string, index?: number) => void;
  goTo: (index: number) => void;
  stop: () => void;
}

export const useSeancePlay = create<PlayState>()(set => ({
  seanceId: null,
  index: 0,
  start: (seanceId, index = 0) => set({ seanceId, index }),
  goTo: index => set({ index }),
  stop: () => set({ seanceId: null, index: 0 }),
}));
