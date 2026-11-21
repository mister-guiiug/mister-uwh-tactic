import { create } from 'zustand';
import {
  freshClock,
  pauseClock,
  resumeClock,
  type PhaseClock,
} from '../../app/clock.ts';

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
  index: number;
  clock: PhaseClock;
  start: (seanceId: string, index?: number) => void;
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
  index: 0,
  clock: freshClock(0),
  start: (seanceId, index = 0) =>
    set({ seanceId, index, clock: freshClock(Date.now()) }),
  goTo: index => set({ index, clock: freshClock(Date.now()) }),
  stop: () => set({ seanceId: null, index: 0, clock: freshClock(0) }),
  pause: () => set(state => ({ clock: pauseClock(state.clock, Date.now()) })),
  resume: () => set(state => ({ clock: resumeClock(state.clock, Date.now()) })),
  ring: () => set(state => ({ clock: { ...state.clock, rang: true } })),
}));
