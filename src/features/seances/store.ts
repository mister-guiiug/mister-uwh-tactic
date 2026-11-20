import { create } from 'zustand';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend, onAccountChange } from '../../backend/index.ts';
import { useSchemas } from '../schemas/store.ts';
import {
  SEANCE_LIMITS,
  createSeance,
  moveItem,
  type Seance,
  type SeanceItem,
} from './model.ts';

const log = createLogger('seances');

/**
 * LE DÉLAI D'ÉCRITURE D'UNE SÉANCE QU'ON RETOUCHE. Le nom et les consignes
 * s'enregistrent à la frappe ; avec un compte, chaque écriture part aussi au
 * serveur. Une demi-seconde de calme regroupe les lettres d'un mot en un seul
 * envoi — comme le brouillon du tableau, dont l'écriture est différée. Rien
 * ne se perd pour autant : ce qui attend est écrit avant toute relecture,
 * quand l'éditeur se ferme et quand la page se cache.
 */
export const SAVE_DELAY_MS = 500;

interface SeancesState {
  seances: Seance[];
  /** Celles de l'appareil, hors du compte connecté ; vide sans compte. */
  outside: Seance[];
  ready: boolean;
  error: string | null;
  /** Relit la bibliothèque : au montage de l'écran, au changement de compte. */
  load: () => Promise<void>;
  create: (id: string, name?: string) => Seance;
  /**
   * Remet une séance telle quelle, en tête : « Annuler » une suppression, une
   * séance reçue par un lien.
   */
  restore: (seance: Seance) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addItem: (id: string, schemaId: string) => void;
  removeItem: (id: string, index: number) => void;
  moveItem: (id: string, from: number, to: number) => void;
  updateItem: (id: string, index: number, patch: Partial<SeanceItem>) => void;
  /** « Ajouter à mon compte » ; rend combien y sont entrées. */
  adopt: (ids: readonly string[]) => Promise<number>;
}

const byRecent = (a: Seance, b: Seance) =>
  b.updatedAt.localeCompare(a.updatedAt);

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Les séances retouchées dont la dernière version n'est pas encore écrite. */
const enAttente = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * UNE LECTURE DÉPASSÉE NE S'AFFICHE PAS — comme pour les schémas : celle d'un
 * compte qui se déconnecte pendant qu'elle attend le serveur remettrait à
 * l'écran les séances de celui qui vient de partir.
 */
let lecture = 0;

/**
 * LES SÉANCES, DERRIÈRE LE PORT `seances` (ADR 0018, suivi du 20/11/2026) :
 * sur l'appareil sans compte, comme avant ; avec un compte, celles du compte,
 * retrouvées d'un appareil à l'autre. L'écran ne sait pas où elles vivent.
 *
 * L'écran montre tout de suite ce qu'on fait ; l'écriture suit — à l'instant
 * pour une séance créée, remise ou supprimée, après `SAVE_DELAY_MS` pour une
 * retouche. Un refus de la base se DIT (`error`) ; la séance reste sur
 * l'appareil, où le port l'a écrite d'abord.
 */
export const useSeances = create<SeancesState>()((set, get) => {
  const show = (seances: Seance[]) =>
    set({ seances: [...seances].sort(byRecent) });

  const change = (id: string, edit: (seance: Seance) => Seance) => {
    show(
      get().seances.map(seance =>
        seance.id === id
          ? { ...edit(seance), updatedAt: new Date().toISOString() }
          : seance
      )
    );
    saveSoon(id);
  };

  return {
    seances: [],
    outside: [],
    ready: false,
    error: null,

    load: async () => {
      // Ce qui attend s'écrit d'abord : la lecture le compte.
      flushSeances();
      const mienne = ++lecture;
      try {
        const seances = await backend.seances.list();
        const outside = await backend.seances.outside();
        if (mienne !== lecture) return;
        // Une séance retouchée PENDANT la lecture garde ce qu'on vient d'y
        // taper : sa dernière version n'est pas encore écrite.
        const retouchees = get().seances.filter(s => enAttente.has(s.id));
        const ids = new Set(retouchees.map(s => s.id));
        set({
          seances: [...seances.filter(s => !ids.has(s.id)), ...retouchees].sort(
            byRecent
          ),
          outside: [...outside].sort(byRecent),
          ready: true,
          error: null,
        });
      } catch (error) {
        if (mienne !== lecture) return;
        log.warn('lecture des séances impossible', { error });
        set({ ready: true, error: message(error) });
      }
    },

    create: (id, name = '') => {
      const seance = createSeance(id, name);
      show([seance, ...get().seances]);
      persist(seance);
      return seance;
    },

    restore: seance => {
      oublierAttente(seance.id);
      show([seance, ...get().seances.filter(s => s.id !== seance.id)]);
      persist(seance);
    },

    rename: (id, name) =>
      change(id, seance => ({
        ...seance,
        name: name.slice(0, SEANCE_LIMITS.name),
      })),

    remove: id => {
      oublierAttente(id);
      show(get().seances.filter(seance => seance.id !== id));
      backend.seances.remove(id).catch(refus);
    },

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

    /**
     * « AJOUTER À MON COMPTE », pour des séances restées sur l'appareil. LES
     * SCHÉMAS QU'ELLES DÉSIGNENT ET QUE L'APPAREIL GARDE HORS DU COMPTE LES
     * SUIVENT : une séance arrivée sans eux sur un autre appareil n'aurait
     * rien à présenter. Ils passent d'abord, par leur propre geste.
     */
    adopt: async ids => {
      try {
        const voulues = new Set(ids);
        const designes = new Set(
          get()
            .outside.filter(s => voulues.has(s.id))
            .flatMap(s => s.items.map(item => item.schemaId))
        );
        const bibliotheque = useSchemas.getState();
        if (designes.size > 0 && !bibliotheque.ready) await bibliotheque.load();
        const schemas = useSchemas
          .getState()
          .outside.filter(t => designes.has(t.id))
          .map(t => t.id);
        if (schemas.length > 0) await useSchemas.getState().adopt(schemas);

        const { adopted, refused } = await backend.seances.adopt(ids);
        await get().load();
        if (refused.length > 0) set({ error: refused[0]!.message });
        return adopted;
      } catch (error) {
        set({ error: message(error) });
        return 0;
      }
    },
  };
});

function refus(error: unknown): void {
  log.warn('écriture d’une séance refusée', { error });
  useSeances.setState({ error: message(error) });
}

/** Écrit une séance par le port ; l'appareil d'abord, le serveur ensuite. */
function persist(seance: Seance): void {
  backend.seances.save(seance).catch(refus);
}

function oublierAttente(id: string): void {
  clearTimeout(enAttente.get(id));
  enAttente.delete(id);
}

function saveSoon(id: string): void {
  clearTimeout(enAttente.get(id));
  enAttente.set(
    id,
    setTimeout(() => {
      enAttente.delete(id);
      const seance = useSeances.getState().seances.find(s => s.id === id);
      if (seance) persist(seance);
    }, SAVE_DELAY_MS)
  );
}

/**
 * ÉCRIT TOUT DE SUITE CE QUI ATTENDAIT. Le port écrit sur l'appareil avant
 * de rendre la main : appelé quand la page se cache, rien de ce qu'on vient
 * de taper ne reste en mémoire seulement.
 */
export function flushSeances(): void {
  for (const id of [...enAttente.keys()]) {
    oublierAttente(id);
    const seance = useSeances.getState().seances.find(s => s.id === id);
    if (seance) persist(seance);
  }
}

/**
 * LA BIBLIOTHÈQUE DES SÉANCES SUIT LE COMPTE ET LE RÉSEAU, comme celle des
 * schémas : relue à l'entrée et à la sortie d'un compte, et au retour du
 * réseau — cette lecture envoie ce qui attendait. Seulement une fois lue :
 * avant, il n'y a rien à rafraîchir. Et ce qui attend s'écrit quand la page
 * se cache : un téléphone mis en veille au bord du bassin ne perd pas la
 * consigne qu'on finissait de taper.
 */
export function followSeances(target: Window = window): () => void {
  const relire = () => {
    if (useSeances.getState().ready) void useSeances.getState().load();
  };
  const cachee = () => {
    if (target.document.visibilityState === 'hidden') flushSeances();
  };
  const desabonner = onAccountChange(relire);
  target.addEventListener('online', relire);
  target.addEventListener('pagehide', flushSeances);
  target.document.addEventListener('visibilitychange', cachee);
  return () => {
    desabonner();
    target.removeEventListener('online', relire);
    target.removeEventListener('pagehide', flushSeances);
    target.document.removeEventListener('visibilitychange', cachee);
  };
}

if (typeof window !== 'undefined') followSeances();

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
