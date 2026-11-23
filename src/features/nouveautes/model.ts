import { z } from 'zod';

/**
 * « QUOI DE NEUF » (ADR 0039) : une carte sur l'accueil pour l'entraîneur qui
 * revient, montrée une fois par LOT de nouveautés.
 *
 * LE LOT, PAS LA VERSION. La carte revient quand cet identifiant change, et
 * seulement alors : l'application se publie plusieurs fois par jour, et une
 * carte qui reviendrait à chaque version ne serait plus lue. Préparer le lot
 * suivant : changer `LOT`, réécrire `NEWS` (`news.ts`) et les textes
 * `news.*` des cinq catalogues.
 *
 * Ce module décide SI la carte paraît ; il est dans l'accueil. Ce qu'elle
 * montre (`news.ts`, `NewsCard.tsx`) se charge à la demande.
 */
export const LOT = '2026-11';

/** Ce qui est gardé : le dernier lot réglé, fermé ou passé au nouveau venu. */
export const seenSchema = z.object({ seen: z.string().max(32).nullable() });
export type Seen = z.infer<typeof seenSchema>;

/**
 * LES TRACES D'UN USAGE, sous le préfixe de l'application : des clés que
 * seul un GESTE écrit — un schéma enregistré (ou un compte, `schemas@…`),
 * une séance, une note, l'effectif, un match, le bassin du club, les
 * premiers pas ou le guide fermés, l'économie d'énergie.
 *
 * PAS LE MODE CHOISI (`:mode`) : c'est un toucher sur la carte d'accueil, et
 * toute la suite e2e le pose d'office. PAS LE BROUILLON NU (`tableau`) : le
 * mode simple l'écrit tout seul à la première ouverture (six contre six) ;
 * c'est son contenu qui compte, lu à part (`usedBefore`).
 */
export const TRACES = [
  'schemas',
  'seances',
  'notes',
  'effectif',
  'match',
  'bassin',
  ':premiers-pas',
  ':guide-simple',
  ':eco',
] as const;

/**
 * L'APPAREIL A-T-IL SERVI AVANT CE LOT ? Une trace parmi les clés (`TRACES`,
 * préfixe ôté), ou un brouillon TOUCHÉ depuis sa création : la règle même
 * qui décide si le brouillon vaut qu'on demande avant de le remplacer
 * (`worthKeeping`, `saveState.ts`). Un brouillon remis à neuf, un schéma
 * reçu par un lien et seulement regardé ne comptent pas.
 */
export function usedBefore(
  keys: readonly string[],
  draft: { createdAt: string; updatedAt: string }
): boolean {
  return (
    draft.updatedAt !== draft.createdAt ||
    keys.some(key => TRACES.some(trace => key.startsWith(trace)))
  );
}

/**
 * CE QUE DÉCIDE LA PREMIÈRE LECTURE DE LA PAGE :
 *
 * - `settled` : ce lot est réglé — la carte a été fermée, ou l'appareil l'a
 *   reçu en nouveau venu ;
 * - `show` : l'appareil a déjà servi — un lot d'avant réglé, ou des traces —
 *   et ce lot-ci ne l'est pas ;
 * - `newcomer` : rien à retrouver. Le lot est marqué réglé sans rien montrer :
 *   au lot suivant, l'appareil reviendra, et la carte avec lui.
 */
export type Verdict = 'settled' | 'show' | 'newcomer';

export function verdict(
  lot: string,
  seen: string | null,
  used: boolean
): Verdict {
  if (seen === lot) return 'settled';
  return seen !== null || used ? 'show' : 'newcomer';
}
