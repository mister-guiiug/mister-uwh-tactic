import type { Locale } from './index.ts';

/**
 * CHAQUE LANGUE NOMMÉE DANS LA SIENNE, pour le sélecteur des Réglages :
 * qui a atterri dans une langue qu'il ne lit pas doit pouvoir reconnaître
 * la sienne sans comprendre le reste de l'écran. Ces noms ne se traduisent
 * donc pas, et ne vivent pas dans les catalogues.
 *
 * Hors de `index.ts`, à dessein : ce module n'est lu que par les Réglages,
 * chargés à la demande, et l'accueil n'a pas à le porter.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  nl: 'Nederlands',
  de: 'Deutsch',
};
