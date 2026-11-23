import { create } from 'zustand';
import {
  freshClock,
  pauseClock,
  resumeClock,
  type PhaseClock,
} from '../../app/clock.ts';
import type { Tactic } from '../board/model.ts';
import { boardStore } from '../board/store.ts';
import type { Seance } from './model.ts';

/**
 * UNE SÉANCE REÇUE PAR LE LIEN POUR LES JOUEURS (ADR 0040) : présentée, pas
 * rangée. Elle n'est pas dans la bibliothèque ; la présentation la porte,
 * avec ses schémas, le temps qu'elle dure.
 */
export interface GuestSeance {
  seance: Seance;
  schemas: Tactic[];
}

/**
 * LA SÉANCE EN COURS DE PRÉSENTATION : laquelle, à quelle phase, et le
 * chronomètre de cette phase. Le tableau la lit pour offrir « Phase
 * suivante » dans sa barre de présentation ; elle s'efface quand la
 * présentation s'arrête.
 *
 * À PART DU MAGASIN DES SÉANCES, et c'est le point : le tableau, dans
 * l'accueil, n'a besoin que de savoir si une séance se présente. La
 * bibliothèque des séances et sa synchronisation viennent avec la barre de
 * séance, à la demande — elles pesaient dans le préchargé (237,5 kB sur
 * 246 le 20/11/2026).
 */
interface PlayState {
  seanceId: string | null;
  /** La séance et ses schémas quand ils ne sont pas dans la bibliothèque. */
  guest: GuestSeance | null;
  index: number;
  clock: PhaseClock;
  start: (seanceId: string, index?: number, guest?: GuestSeance) => void;
  /** Change de phase : le chronomètre repart. */
  goTo: (index: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  /** Le signal de fin est donné : il ne sonne qu'une fois par phase. */
  ring: () => void;
}

export const useSeancePlay = create<PlayState>()(set => ({
  seanceId: null,
  guest: null,
  index: 0,
  clock: freshClock(0),
  start: (seanceId, index = 0, guest) =>
    set({
      seanceId,
      guest: guest ?? null,
      index,
      clock: freshClock(Date.now()),
    }),
  goTo: index => set({ index, clock: freshClock(Date.now()) }),
  stop: () =>
    set({ seanceId: null, guest: null, index: 0, clock: freshClock(0) }),
  pause: () => set(state => ({ clock: pauseClock(state.clock, Date.now()) })),
  resume: () => set(state => ({ clock: resumeClock(state.clock, Date.now()) })),
  ring: () => set(state => ({ clock: { ...state.clock, rang: true } })),
}));

/**
 * PRÉSENTER UNE SÉANCE REÇUE SANS LA RANGER (ADR 0040) : sa première phase
 * sur le tableau, et la présentation qui la porte. Rien n'entre dans la
 * bibliothèque. Rend `false`, sans toucher au tableau, quand elle n'a rien
 * à montrer.
 *
 * Ici, et pas avec le décodeur : `share.ts` vient à la demande, et le faire
 * dépendre du magasin du tableau sortait celui-ci de l'accueil dans un
 * morceau à part, préchargé quand même — un fichier de plus à l'ouverture,
 * et 247,2 kB préchargés contre 247,1 (mesuré le 23/11/2026).
 */
export function presentGuest(guest: GuestSeance): boolean {
  const firstId = guest.seance.items[0]?.schemaId;
  const first = guest.schemas.find(schema => schema.id === firstId);
  if (!first) return false;
  boardStore.getState().load(first);
  useSeancePlay.getState().start(guest.seance.id, 0, guest);
  return true;
}
