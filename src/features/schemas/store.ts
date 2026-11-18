import { create } from 'zustand';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend } from '../../backend/index.ts';
import type { Tactic } from '../board/model.ts';

const log = createLogger('schemas');

interface SchemasState {
  schemas: Tactic[];
  ready: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (tactic: Tactic) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const byRecent = (a: Tactic, b: Tactic) =>
  b.updatedAt.localeCompare(a.updatedAt);

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * La bibliothèque de schémas, derrière le port `schemas` : l'écran ne sait
 * pas où ils vivent. Une écriture refusée restaure l'état d'avant et le DIT,
 * plutôt que de laisser croire qu'un schéma est enregistré.
 */
export const useSchemas = create<SchemasState>()((set, get) => ({
  schemas: [],
  ready: false,
  error: null,

  load: async () => {
    try {
      const schemas = await backend.schemas.list();
      set({ schemas: [...schemas].sort(byRecent), ready: true, error: null });
    } catch (error) {
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

if (typeof window !== 'undefined') syncOnReconnect();
