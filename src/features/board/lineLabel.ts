import { useI18n } from '../../i18n/index.ts';
import type { Tactic } from './model.ts';
import { useBoard } from './store.ts';
import { variantOf, type LineId } from './variants.ts';

type T = ReturnType<typeof useI18n>['t'];

/**
 * LE NOM D'UNE LIGNE, tel qu'on le lit (ADR 0027) : le sien, sinon
 * « Ligne principale » ou « Variante 2 », dans la langue de l'écran. Un nom
 * vide n'est pas écrit dans le schéma : il suit la langue de qui le lit.
 */
export function lineLabel(t: T, doc: Tactic, line: LineId): string {
  const variant = variantOf(doc, line);
  if (!variant) return doc.mainLine || t('variants.main');
  const index = doc.variants!.indexOf(variant);
  return variant.name || t('variants.unnamed', { n: index + 1 });
}

/**
 * Le nom de la ligne affichée, quand le schéma en a plusieurs ; `null`
 * sinon — un schéma sans variante ne parle pas de lignes.
 */
export function useLineLabel(): string | null {
  const { t } = useI18n();
  const doc = useBoard(s => s.doc);
  const line = useBoard(s => s.line);
  return doc.variants ? lineLabel(t, doc, line) : null;
}
