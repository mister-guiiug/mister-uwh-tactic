/**
 * LE CARNET DE JEU À LA DEMANDE (ADR 0023), dans un seul morceau : la barre
 * de sélection, le corps de la feuille de partage, l'avis d'arrivée, et le
 * codeur qui fabrique et relit le lien. L'écran Schémas est dans l'accueil ;
 * ceci n'y est pas. Le même thunk sert `lazy()` et le préchargement au
 * repos : le morceau est là au premier « Sélectionner », et dans le précache
 * du service worker — un carnet reçu sans réseau s'ouvre quand même.
 */
export { ArrivalNotice, PickBar } from './bars.tsx';
export { CarnetShare } from './CarnetShare.tsx';
// Le livret imprimé (ADR 0037) : la barre de sélection, d'où il part, a déjà
// chargé ce morceau — l'impression n'attend rien.
export { CarnetPrint } from './CarnetPrint.tsx';
export { receiveCarnet } from './share.ts';
