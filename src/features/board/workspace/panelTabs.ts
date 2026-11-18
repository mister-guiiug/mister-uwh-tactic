/**
 * Les onglets du panneau contextuel, dans leur ordre d'affichage (ADR 0017).
 *
 * Cinq, rangés par OBJET : l'étape (ouverte en arrivant), le jeton (qui
 * s'ouvre au choix d'un joueur), les équipes, le règlement, le bassin.
 * L'apnée a rejoint la frise — c'est une affaire de temps —, l'affichage le
 * menu « Calques » posé sur le terrain.
 */
export const PANEL_TABS = ['step', 'token', 'teams', 'rules', 'pool'] as const;

export type PanelTab = (typeof PANEL_TABS)[number];

/** Le champ du nom, que le double-clic sur un jeton met en main. */
export const INSPECTOR_NAME_ID = 'uwh-inspector-name';
