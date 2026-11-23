import type { BoardRequest } from '../board/request.ts';

/**
 * LES NOUVEAUTÉS DU LOT EN COURS (`LOT`, `model.ts`). À part du modèle :
 * seule la carte les lit, et elles la suivent dans son morceau, chargé à la
 * demande (ADR 0039).
 */

/** Une nouveauté : sa clé dans `news.*`, et où l'on s'en sert. */
export type NewsId =
  'variants' | 'playerLink' | 'printedCarnet' | 'effectif' | 'match';

export interface News {
  id: NewsId;
  /** L'écran où l'on s'en sert. */
  to: string;
  /** La fonction ouverte en arrivant, quand l'écran sait l'ouvrir. */
  state?: BoardRequest;
  /** Le mode simple ne s'en sert pas : la carte ne la lui montre pas. */
  advancedOnly?: boolean;
}

/**
 * CINQ, LES PLUS UTILES À UN ENTRAÎNEUR, dans l'ordre où il s'en sert :
 * écrire la phase, l'envoyer aux joueurs, l'emporter sur papier, y mettre
 * ses joueurs, puis le match. Le reste du lot (zones, feutre, nages courbes,
 * étape racontée, enregistrement en direct, suivre un joueur, adversaire,
 * versions, langues) se trouve en s'en servant ; la carte ne le liste pas.
 */
export const NEWS: readonly News[] = [
  // Les variantes se créent en mode complet ; le simple les lit seulement.
  { id: 'variants', to: '/', state: { lines: true }, advancedOnly: true },
  { id: 'playerLink', to: '/', state: { menu: true } },
  { id: 'printedCarnet', to: '/schemas' },
  { id: 'effectif', to: '/effectif' },
  { id: 'match', to: '/match' },
];

/** Ce que voit un mode : le simple n'a pas ce qu'il ne sait pas faire. */
export const newsFor = (simple: boolean) =>
  NEWS.filter(news => !(simple && news.advancedOnly));
