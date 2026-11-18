import { create } from 'zustand';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend, onAccountChange } from '../../backend/index.ts';
import type { Tactic } from '../board/model.ts';

const log = createLogger('schemas');

interface SchemasState {
  schemas: Tactic[];
  /** Ceux de l'appareil, hors du compte connecté ; vide sans compte. */
  outside: Tactic[];
  ready: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (tactic: Tactic) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** « Ajouter à mon compte » ; rend combien y sont entrés. */
  adopt: (ids: readonly string[]) => Promise<number>;
}

const byRecent = (a: Tactic, b: Tactic) =>
  b.updatedAt.localeCompare(a.updatedAt);

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * La bibliothèque de schémas, derrière le port `schemas` : l'écran ne sait
 * pas où ils vivent. Une écriture refusée restaure l'état d'avant et le DIT,
 * plutôt que de laisser croire qu'un schéma est enregistré.
 *
 * UNE LECTURE DÉPASSÉE NE S'AFFICHE PAS. Celle d'un compte qui se déconnecte
 * pendant qu'elle attend le serveur reviendrait après celle de l'appareil, et
 * remettrait à l'écran les schémas de celui qui vient de partir.
 */
let lecture = 0;

export const useSchemas = create<SchemasState>()((set, get) => ({
  schemas: [],
  outside: [],
  ready: false,
  error: null,

  load: async () => {
    const mienne = ++lecture;
    try {
      // Dans cet ordre : la lecture du compte reprend d'abord à l'appareil
      // ce qui est déjà à lui, et ce qui reste est vraiment « hors compte ».
      const schemas = await backend.schemas.list();
      const outside = await backend.schemas.outside();
      if (mienne !== lecture) return;
      set({
        schemas: [...schemas].sort(byRecent),
        outside: [...outside].sort(byRecent),
        ready: true,
        error: null,
      });
    } catch (error) {
      if (mienne !== lecture) return;
      log.warn('lecture des schémas impossible', { error });
      set({ ready: true, error: message(error) });
    }
  },

  save: async tactic => {
    const before = get().schemas;
    set({
      schemas: [tactic, ...before.filter(s => s.id !== tactic.id)].sort(
        byRecent
      ),
      // Ouvert depuis « hors de votre compte » puis enregistré avec un
      // compte : il est désormais au compte, plus sur l'appareil seul.
      outside: get().outside.filter(s => s.id !== tactic.id),
      error: null,
    });
    try {
      await backend.schemas.save(tactic);
    } catch (error) {
      set({ schemas: before, error: message(error) });
      throw error;
    }
  },

  remove: async id => {
    const before = get().schemas;
    set({ schemas: before.filter(s => s.id !== id), error: null });
    try {
      await backend.schemas.remove(id);
    } catch (error) {
      set({ schemas: before, error: message(error) });
    }
  },

  adopt: async ids => {
    try {
      const { adopted, refused } = await backend.schemas.adopt(ids);
      await get().load();
      // Ce que la base a refusé est resté sur l'appareil, visible : la
      // raison suit, comme pour un enregistrement refusé.
      if (refused.length > 0) set({ error: refused[0]!.message });
      return adopted;
    } catch (error) {
      set({ error: message(error) });
      return 0;
    }
  },
}));

/**
 * AU RETOUR DU RÉSEAU, LA BIBLIOTHÈQUE SE RELIT — et cette lecture envoie
 * ce qui attendait (ADR 0015) : les schémas enregistrés ou supprimés hors
 * ligne, au bord du bassin, partent dès que le téléphone retrouve le wifi,
 * sans attendre qu'on rouvre l'écran Schémas. Seulement une fois la
 * bibliothèque lue : avant, il n'y a ni liste à rafraîchir ni raison de
 * déranger le serveur. En mode local, la relecture ne quitte pas l'appareil.
 */
export function syncOnReconnect(target: Window = window): () => void {
  const onOnline = () => {
    if (useSchemas.getState().ready) void useSchemas.getState().load();
  };
  target.addEventListener('online', onOnline);
  return () => target.removeEventListener('online', onOnline);
}

/**
 * À L'ENTRÉE ET À LA SORTIE D'UN COMPTE, LA BIBLIOTHÈQUE CHANGE (ADR 0015) :
 * celle du compte, ou celle de l'appareil. Relue si elle l'a déjà été — le
 * tableau en tire l'état de son brouillon, l'écran Schémas sa liste.
 */
export function followAccount(): () => void {
  return onAccountChange(() => {
    if (useSchemas.getState().ready) void useSchemas.getState().load();
  });
}

if (typeof window !== 'undefined') {
  syncOnReconnect();
  followAccount();
}
