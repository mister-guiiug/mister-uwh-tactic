import {
  migrateTactic,
  tacticSchema,
  TACTIC_VERSION,
  type Tactic,
} from '../features/board/model.ts';
import { schemaShelves } from './local.ts';
import { schemaHistory } from './versions.ts';
import {
  createDocumentSync,
  type DocumentsClient,
  type SupabaseDocumentsOptions,
} from './supabase-documents.ts';
import type { SchemasRepository } from './ports.ts';

export { compteSurAppareil } from './supabase-documents.ts';

/** Ce que l'adaptateur demande au client — de quoi en écrire un faux sans le SDK. */
export type SchemasClient = DocumentsClient;
export type SupabaseSchemasOptions = SupabaseDocumentsOptions;

/**
 * LES SCHÉMAS D'UN COMPTE, RETROUVÉS SUR CHAQUE APPAREIL (ADR 0015) — la
 * table `schemas` de `0006_schemas.sql`. La règle entière (l'appareil
 * d'abord, la file marquée du compte, la fusion par date, la copie purgée à
 * la déconnexion de ce qui est parti) est écrite une fois, pour toute sorte
 * de document, dans `supabase-documents.ts` ; les séances la partagent.
 *
 * Une ligne se relit TOUJOURS montée avant d'être validée : `migrateTactic`
 * amène un schéma de n'importe quelle version antérieure jusqu'au modèle
 * courant.
 *
 * Ses versions (ADR 0034) restent sur l'appareil, dans la case du compte :
 * la synchronisation les prévient, elle ne les envoie pas.
 */
const sync = createDocumentSync<Tactic>({
  table: 'schemas',
  shelves: schemaShelves,
  version: TACTIC_VERSION,
  history: schemaHistory,
  read: data => {
    const lu = tacticSchema.safeParse(migrateTactic(data));
    return lu.success ? lu.data : null;
  },
});

/** Ce que le serveur n'a pas encore reçu, et le compte à qui c'est. */
export const schemasSyncStore = sync.syncStore;

/** Ce que le serveur a déjà, compte par compte et schéma par schéma. */
export const schemasRecusStore = sync.recusStore;

/** À l'effacement du compte : sa copie et ses envois en attente. */
export const forgetAccountSchemas = sync.forgetAccount;

/** À la déconnexion : la copie du compte ne garde que ce qui n'est pas parti. */
export const leaveAccountSchemas = sync.leaveAccount;

/** Range un schéma dans la copie d'un compte, comme une écriture en attente. */
export const parkAccountSchema = sync.park;

/** Ce que l'appareil tient pour ce compte : sa copie, puis l'appareil. */
export const schemasHeldFor = sync.heldFor;

export function createSupabaseSchemas(
  options: SupabaseSchemasOptions = {}
): SchemasRepository {
  return sync.repository(options);
}
