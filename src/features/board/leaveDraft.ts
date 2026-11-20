import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { onAccountLeave, type AccountLeaving } from '../../backend/index.ts';
import { createTactic, type Tactic } from './model.ts';
import { saveStateOf, worthKeeping } from './saveState.ts';
import {
  boardStore,
  defaultPitchStore,
  draftStore,
  type BoardStore,
} from './store.ts';

/**
 * CE QUE DEVIENT LE BROUILLON QUAND SON COMPTE S'EN VA (ADR 0015, suivi du
 * 20/11/2026).
 *
 * - `keep` : il porte un travail que rien d'autre ne tient — modifié depuis
 *   son enregistrement, ou neuf et touché (`worthKeeping`, la règle qui
 *   décide déjà s'il faut prévenir avant de le remplacer). Il est rangé dans
 *   la copie du compte, comme une écriture en attente ;
 * - `drop` : vierge, ou déjà là tel quel — dans la copie du compte (que le
 *   serveur l'ait ou qu'il attende d'y partir) ou dans la bibliothèque de
 *   l'appareil. Rien ne se perd à le remplacer. Un compte effacé ne garde
 *   rien, par définition.
 */
export function draftFate(
  tactic: Tactic,
  leaving: Pick<AccountLeaving, 'erased' | 'held'>
): 'keep' | 'drop' {
  if (leaving.erased) return 'drop';
  const tel = leaving.held.some(
    s => s.id === tactic.id && s.updatedAt === tactic.updatedAt
  );
  if (tel) return 'drop';
  return worthKeeping(saveStateOf(tactic, leaving.held), tactic)
    ? 'keep'
    : 'drop';
}

/**
 * LE BROUILLON QUITTE L'ÉCRAN AVEC SON COMPTE, SANS RIEN PERDRE.
 *
 * Une tablette de club passe de main en main. Le brouillon survit à la
 * fermeture de l'onglet (ADR 0016) ; il survivait aussi à la déconnexion, et
 * la personne suivante trouvait au tableau la phase de l'entraîneur d'avant.
 * Ce qui vaut d'être gardé part dans la copie de son compte — il le
 * retrouvera à sa prochaine connexion sur cet appareil, et le serveur avec
 * lui —, puis le tableau repart à neuf.
 *
 * `load`, pas `reset` : le tableau neuf n'a pas d'historique. « Annuler » ne
 * doit pas rendre à la personne suivante le travail de la précédente. Écrit
 * TOUT DE SUITE sur l'appareil, sans attendre l'écriture différée du
 * tableau : un onglet fermé dans la foulée rouvrirait l'ancien brouillon.
 */
export function leaveDraft(
  leaving: AccountLeaving,
  store: BoardStore = boardStore
): void {
  const { tactic } = store.getState();
  if (draftFate(tactic, leaving) === 'keep') leaving.keep(tactic);
  const neuf = createTactic({
    id: createUuid(),
    name: '',
    pitch: defaultPitchStore.load(),
  });
  store.getState().load(neuf);
  if (store === boardStore) draftStore.save(store.getState().tactic);
}

/**
 * Branché une fois, au démarrage (`main.tsx`) : le backend prévient du
 * départ d'un compte, le tableau dit ce que vaut son brouillon.
 */
export function followAccountWithDraft(): () => void {
  return onAccountLeave(leaving => leaveDraft(leaving));
}
