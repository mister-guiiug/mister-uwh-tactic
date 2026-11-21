import { createElement, type ReactNode } from 'react';
import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n-lite';
import {
  LabelsProvider,
  type LabelGroups,
} from '@mister-guiiug/dev-pwa-config/react/labels-core';
import { fr, type Messages } from './messages.ts';

/**
 * LES CINQ LANGUES, et pourquoi celles-là : le français et l'anglais de
 * départ, puis l'espagnol, le néerlandais et l'allemand — la Colombie,
 * l'Espagne, l'Argentine, les Pays-Bas et l'Allemagne jouent beaucoup au
 * hockey subaquatique (ADR 0024). Les libellés des composants du socle
 * existent déjà dans ces langues.
 */
export const LOCALES = ['fr', 'en', 'es', 'nl', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * LE CATALOGUE, REMPLI À LA DEMANDE. Le français est dans l'accueil : c'est la
 * langue de repli. Les autres arrivent par `loadLocale`, chacune dans son
 * morceau. Tant qu'une langue manque, le socle retombe sur le français, clé
 * par clé (`createTranslator`) — d'où le transtypage : le catalogue promet ce
 * que `loadLocale` tient avant que la langue ne s'affiche.
 */
const catalog = { fr } as Record<Locale, Messages>;

const loaders: Record<Locale, () => Promise<Messages>> = {
  fr: async () => fr,
  en: async () => (await import('./messages.en.ts')).en,
  es: async () => (await import('./messages.es.ts')).es,
  nl: async () => (await import('./messages.nl.ts')).nl,
  de: async () => (await import('./messages.de.ts')).de,
};

/**
 * LES LIBELLÉS DES COMPOSANTS DU SOCLE (« Fermer », « Réessayer »…), dans la
 * langue choisie, chargés AVEC son catalogue. `react/i18n` les embarquait
 * en sept langues dans l'accueil, même pour une app qui en parle moins (et
 * `labels: false` n'y changeait rien : l'import était statique) ;
 * `react/i18n-lite` (socle 6.37.0) les laisse à l'app. Le français est celui
 * du noyau (`labels-core`), toujours là.
 */
const labelCatalog: Partial<Record<Locale, LabelGroups>> = {};

const labelLoaders: Record<
  Exclude<Locale, 'fr'>,
  () => Promise<LabelGroups>
> = {
  en: async () =>
    (await import('@mister-guiiug/dev-pwa-config/react/labels-en')).default,
  es: async () =>
    (await import('@mister-guiiug/dev-pwa-config/react/labels-es')).default,
  nl: async () =>
    (await import('@mister-guiiug/dev-pwa-config/react/labels-nl')).default,
  de: async () =>
    (await import('@mister-guiiug/dev-pwa-config/react/labels-de')).default,
};

/** Charge une langue si elle manque ; à appeler AVANT de l'afficher. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (catalog[locale] && (locale === 'fr' || labelCatalog[locale])) return;
  const [messages, labels] = await Promise.all([
    loaders[locale](),
    locale === 'fr' ? undefined : labelLoaders[locale](),
  ]);
  catalog[locale] = messages;
  if (labels) labelCatalog[locale] = labels;
}

/**
 * La langue que le fournisseur choisira au démarrage : celle rangée par la
 * famille (`dwc_locale`), sinon la première du navigateur qu'on connaît,
 * sinon le français — la règle du socle, relue ici pour charger la bonne
 * langue AVANT le premier rendu.
 *
 * UNE NUANCE, CONNUE : on lit toute la liste `navigator.languages`, le
 * fournisseur du socle seulement `navigator.language`. Pour un navigateur
 * réglé en portugais puis en espagnol, l'espagnol est chargé mais l'écran
 * reste en français. Le morceau de trop ne coûte qu'un téléchargement ; faire
 * suivre l'écran se règle au socle (ADR 0024).
 */
export function initialLocale(): Locale {
  const known = (value: string | null | undefined): Locale | null => {
    const code = value?.slice(0, 2).toLowerCase();
    return LOCALES.find(l => l === code) ?? null;
  };
  try {
    const stored = known(localStorage.getItem('dwc_locale'));
    if (stored) return stored;
  } catch {
    // Stockage refusé : on suit le navigateur.
  }
  const languages =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? []);
  for (const language of languages) {
    const found = known(language);
    if (found) return found;
  }
  return 'fr';
}

/**
 * L'i18n de l'application, déclaré UNE FOIS au niveau module.
 *
 * `storageKey` n'est pas passé : le défaut `dwc_locale` est partagé par toutes
 * les apps de la famille, qui vivent sur la même origine GitHub Pages. La
 * langue choisie suit donc l'utilisateur de l'une à l'autre, et une valeur
 * inconnue de `locales` est simplement ignorée. Une app qui veut s'isoler
 * passe la sienne (motif famille : `'<app>_locale'`).
 *
 * `fmt` VIENT AVEC, et c'est le point. Le contexte rend des formateurs déjà
 * liés à la locale : `fmt.date(d)`, `fmt.number(v)`, `fmt.relative(d)`. Sans
 * eux, chaque écran refait le pont entre « la langue choisie » et « comment on
 * écrit les nombres » — ou l'oublie, ce que le parc a mesuré quatre-vingt-huit
 * fois sous la forme d'un `'fr-FR'` codé en dur.
 *
 * `<html lang>` SUIT SANS RIEN DE PLUS : le fournisseur le pose, avec `dir`,
 * à chaque changement de langue.
 */
const app = createI18n({
  messages: catalog,
  locales: LOCALES,
  fallbackLocale: 'fr',
  // Aucun fournisseur de libellés ici : celui d'en dessous lit les
  // dictionnaires chargés par `loadLocale`.
  labels: false,
});

export const useI18n = app.useI18n;

/** Les libellés du socle dans la langue courante, déjà chargés. */
function SocleLabels({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return createElement(
    LabelsProvider,
    { locale, dictionary: labelCatalog[locale as Locale] },
    children
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return createElement(
    app.I18nProvider,
    null,
    createElement(SocleLabels, null, children)
  );
}
