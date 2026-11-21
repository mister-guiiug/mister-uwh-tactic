/**
 * LES ONGLETS QU'ON N'OUVRE PAS AU DÉMARRAGE, dans un seul morceau.
 *
 * L'accueil ouvre l'onglet « Étape » (ADR 0017) ; le jeton, les équipes,
 * les règles, le bassin et la frise d'apnée attendent un toucher. Les précharger avec l'accueil coûtait au
 * budget du préchargé (217 kB sur 223 le 18/11/2026). Regroupés ici, ils
 * font UN morceau, tiré au repos (`useIdlePrefetch`) et précaché par le
 * service worker : le premier toucher sur un onglet ne voit pas d'attente.
 */
export { ApneaPanel } from './ApneaPanel.tsx';
export { PoolPanel } from './PoolPanel.tsx';
export { RulesPanel } from './RulesPanel.tsx';
export { Inspector } from './Inspector.tsx';
export { TeamsPanel } from './TeamsPanel.tsx';
export { ActionsMenu } from '../workspace/ActionsMenu.tsx';
// La carte « Appliquer mon effectif ? » (ADR 0028) : seulement quand un
// schéma vient d'arriver, et avec elle l'effectif et sa validation.
export { EffectifOffer } from '../../effectif/EffectifOffer.tsx';
// La barre de séance, et avec elle la bibliothèque des séances : seulement
// quand une séance se présente.
export { SeanceNav } from '../../seances/SeanceNav.tsx';
// L'embranchement de la présentation (ADR 0027) et la liste des zones et des
// mots de l'onglet « Étape » (ADR 0026) : ni l'un ni l'autre n'est à
// l'ouverture. Ils rendaient le préchargé à sa borne (246,0 kB le 21/11/2026).
export { ForkChoice } from '../workspace/ForkChoice.tsx';
export { StepMarks } from './StepMarks.tsx';
