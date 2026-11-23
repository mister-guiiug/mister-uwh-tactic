/**
 * CE QU'ON DEMANDE AU TABLEAU EN Y ARRIVANT, par l'état du routeur
 * (`navigate('/', { state })`, `<Link state>`). Le tableau efface la demande
 * de l'historique, puis l'exécute : un retour en arrière ne la rejoue pas.
 *
 * - `present` : la présentation — une séance, la palette, le lien « pour les
 *   joueurs » (ADR 0018, 0035) ;
 * - `menu` : le menu « ⋯ », où sont le partage et le lien pour les joueurs ;
 * - `lines` : les lignes de la phase, depuis la frise (ADR 0027).
 *
 * Les deux dernières viennent de « Quoi de neuf » (ADR 0039) : un lien de la
 * carte ouvre la fonction qu'il nomme, pas seulement l'écran.
 */
export interface BoardRequest {
  present?: boolean;
  menu?: boolean;
  lines?: boolean;
}

/** L'état du routeur, lu comme une demande ; rien de lisible, aucune. */
export const boardRequest = (state: unknown): BoardRequest =>
  state !== null && typeof state === 'object' ? (state as BoardRequest) : {};
