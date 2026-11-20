import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { fr, type Messages } from './messages.ts';

export type Locale = 'fr' | 'en';
export const LOCALES = ['fr', 'en'] as const;

/**
 * LE CATALOGUE, REMPLI À LA DEMANDE. Le français est dans l'accueil : c'est la
 * langue de repli. L'anglais arrive par `loadLocale`, dans son morceau. Tant
 * qu'une langue manque, le socle retombe sur le français, clé par clé
 * (`createTranslator`) — d'où le transtypage : le catalogue promet ce que
 * `loadLocale` tient avant que la langue ne s'affiche.
 */
const catalog = { fr } as Record<Locale, Messages>;

const loaders: Record<Locale, () => Promise<Messages>> = {
  fr: async () => fr,
  en: async () => (await import('./messages.en.ts')).en,
};

/** Charge une langue si elle manque ; à appeler AVANT de l'afficher. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (catalog[locale]) return;
  catalog[locale] = await loaders[locale]();
}

/**
 * La langue que le fournisseur choisira au démarrage : celle rangée par la
 * famille (`dwc_locale`), sinon la première du navigateur qu'on connaît,
 * sinon le français — la règle du socle, relue ici pour charger la bonne
 * langue AVANT le premier rendu.
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
 */
export const { I18nProvider, useI18n } = createI18n({
  messages: catalog,
  locales: LOCALES,
  fallbackLocale: 'fr',
});
