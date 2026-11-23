import { create } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { boardStore } from '../board/store.ts';
import { LOT, seenSchema, usedBefore, verdict, type Seen } from './model.ts';

/**
 * LE LOT RÉGLÉ, SUR L'APPAREIL (ADR 0039). Clé préfixée par l'application,
 * préfixe et clé collés comme le veut le socle (`mister-uwh-tacticnouveautes`) :
 * toutes les apps du parc partagent la même origine, donc le même
 * `localStorage`.
 */
export const newsStore = createVersionedStore<Seen>({
  store: 'mister-uwh-tactic',
  key: 'nouveautes',
  version: 1,
  validate: data => seenSchema.parse(data),
  seed: () => ({ seen: null }),
});

interface NewsState {
  /** La carte est à montrer. */
  shown: boolean;
  /** Fermer : ce lot est réglé, la carte ne revient qu'au suivant. */
  close: () => void;
}

/**
 * L'ÉTAT DE LA CARTE, DÉCIDÉ UNE FOIS, À LA PREMIÈRE LECTURE DE LA PAGE —
 * avant que la session n'écrive quoi que ce soit : un lien partagé qui range
 * un schéma, le mode simple qui remet le brouillon à six contre six. Lues
 * plus tard, ces écritures feraient passer le nouveau venu pour un habitué.
 *
 * Le nouveau venu reçoit le lot réglé sans rien voir. C'est ce qui rend le
 * signal plus sûr au lot suivant : quiconque a ouvert l'application depuis
 * celui-ci a un lot réglé, et revient à coup sûr.
 *
 * `lot` et `draft` sont des paramètres pour les tests : l'application n'en a
 * qu'une instance, `useNews`.
 */
export function createNews(
  lot: string = LOT,
  draft: () => { createdAt: string; updatedAt: string } = () =>
    boardStore.getState().doc
) {
  return create<NewsState>()(set => {
    const { seen } = newsStore.load();
    const decided = verdict(
      lot,
      seen,
      usedBefore(newsStore.store.keys(), draft())
    );
    if (decided === 'newcomer') newsStore.save({ seen: lot });
    return {
      shown: decided === 'show',
      close: () => {
        newsStore.save({ seen: lot });
        set({ shown: false });
      },
    };
  });
}

export const useNews = createNews();
