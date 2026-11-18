import { useEffect } from 'react';
import { useSchemas } from '../schemas/store.ts';
import type { Tactic } from './model.ts';
import { useBoard } from './store.ts';

/**
 * OÙ EN EST LE BROUILLON, par rapport à la bibliothèque.
 *
 * - `draft` : jamais enregistré — fermer l'onglet ne le perd pas (le
 *   brouillon survit sur l'appareil), mais il n'est pas dans « Schémas ».
 * - `dirty` : enregistré, puis modifié depuis.
 * - `saved` : la bibliothèque a la même version.
 * - `unknown` : la bibliothèque n'est pas encore lue.
 *
 * Chaque geste du tableau date le schéma (`updatedAt`) ; « Enregistrer »
 * copie le brouillon tel quel. Comparer les deux dates suffit.
 */
export type SaveState = 'draft' | 'dirty' | 'saved' | 'unknown';

export function saveStateOf(
  tactic: Tactic,
  library: readonly Tactic[] | null
): SaveState {
  if (library === null) return 'unknown';
  const saved = library.find(s => s.id === tactic.id);
  if (!saved) return 'draft';
  return saved.updatedAt === tactic.updatedAt ? 'saved' : 'dirty';
}

/** L'état du brouillon, la bibliothèque lue au besoin. */
export function useSaveState(): SaveState {
  const tactic = useBoard(s => s.tactic);
  const schemas = useSchemas(s => s.schemas);
  const ready = useSchemas(s => s.ready);
  const load = useSchemas(s => s.load);
  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);
  return saveStateOf(tactic, ready ? schemas : null);
}

/**
 * Un brouillon vaut-il qu'on demande avant de le remplacer ? Seulement s'il
 * porte un travail que la bibliothèque n'a pas : modifié depuis son
 * enregistrement, ou jamais enregistré mais touché depuis sa création. Un
 * tableau vierge, à l'engagement, se remplace sans question.
 */
export const worthKeeping = (state: SaveState, tactic: Tactic) =>
  state === 'dirty' ||
  (state === 'draft' && tactic.updatedAt !== tactic.createdAt);
