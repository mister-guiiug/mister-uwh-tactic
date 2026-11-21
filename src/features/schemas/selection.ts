import type { Tactic } from '../board/model.ts';

/**
 * LA SÉLECTION DE LA BIBLIOTHÈQUE (ADR 0023) : des identifiants, rien de
 * plus. Elle survit au filtre — un schéma coché puis masqué par la recherche
 * reste coché — et « tout » vaut pour ce que l'écran montre.
 *
 * Lue par la barre de sélection, qui se charge avec le carnet : l'écran
 * Schémas ne coche qu'une case à la fois, en une ligne.
 */
export type Picked = ReadonlySet<string>;

/** Ce que coche « Tout » parmi `ids` : rien, une partie, ou tout. */
export function coverage(
  picked: Picked,
  ids: readonly string[]
): 'none' | 'some' | 'all' {
  const count = ids.filter(id => picked.has(id)).length;
  return count === 0 ? 'none' : count === ids.length ? 'all' : 'some';
}

/** « Tout » : coche ce que l'écran montre, ou le décoche s'il l'est déjà. */
export function toggleAll(picked: Picked, ids: readonly string[]): Picked {
  const next = new Set(picked);
  if (coverage(picked, ids) === 'all') {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  return next;
}

/**
 * Les schémas cochés, dans l'ordre de `schemas` ; un identifiant dont le
 * schéma a disparu depuis — supprimé, ou parti avec un compte — est ignoré.
 */
export function pickedSchemas(
  schemas: readonly Tactic[],
  picked: Picked
): Tactic[] {
  return schemas.filter(schema => picked.has(schema.id));
}
