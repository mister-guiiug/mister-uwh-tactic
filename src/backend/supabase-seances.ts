import {
  SEANCE_VERSION,
  seanceSchema,
  type Seance,
} from '../features/seances/model.ts';
import { seanceShelves } from './local.ts';
import {
  createDocumentSync,
  type SupabaseDocumentsOptions,
} from './supabase-documents.ts';
import type { SeancesRepository } from './ports.ts';

/**
 * LES SÉANCES D'UN COMPTE, RETROUVÉES SUR CHAQUE APPAREIL (ADR 0018, suivi du
 * 20/11/2026) — la table `seances` de `0007_seances.sql`, synchronisée par la
 * même règle que les schémas (`supabase-documents.ts`) : préparée sur
 * l'ordinateur, la séance attend sur la tablette du bord du bassin, et ce
 * qui a été retouché hors ligne part au retour du réseau.
 *
 * Une séance désigne ses schémas par identifiant ; la ligne ne les recopie
 * pas. Ils suivent le même compte par leur propre table.
 */
const sync = createDocumentSync<Seance>({
  table: 'seances',
  shelves: seanceShelves,
  version: SEANCE_VERSION,
  read: data => {
    const lu = seanceSchema.safeParse(data);
    return lu.success ? lu.data : null;
  },
});

export const seancesSyncStore = sync.syncStore;
export const seancesRecusStore = sync.recusStore;
export const forgetAccountSeances = sync.forgetAccount;
export const leaveAccountSeances = sync.leaveAccount;

export function createSupabaseSeances(
  options: SupabaseDocumentsOptions = {}
): SeancesRepository {
  return sync.repository(options);
}
