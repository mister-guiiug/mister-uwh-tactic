/** Les onglets du panneau contextuel, dans leur ordre d'affichage. */
export const PANEL_TABS = [
  'selection',
  'step',
  'teams',
  'rules',
  'apnea',
  'pool',
] as const;
export type PanelTab = (typeof PANEL_TABS)[number];
