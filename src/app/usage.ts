import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import type { GESTES } from '@mister-guiiug/dev-pwa-config/analytics';

/*
 * Les noms en LITTÉRAUX, vérifiés par le type du socle : plusieurs tests
 * remplacent ce module par un faux qui n'a que `trackEvent`, où un `GESTES`
 * importé vaudrait `undefined` — et tout composant instrumenté casserait au
 * chargement.
 */
type Geste = (typeof GESTES)[keyof typeof GESTES];
const CREATION = 'creation' satisfies Geste;
const EXPORT = 'export' satisfies Geste;
const PARTIE = 'partie' satisfies Geste;
const OPERATION = 'operation' satisfies Geste;
const CONSULTATION = 'consultation' satisfies Geste;

/**
 * CE QUI SERT, ET CE QUI NE SERT PAS : une vingtaine de fonctions sont arrivées
 * du 20 au 23/11/2026, et la mesure n'en voyait aucune — huit événements, tous
 * plus anciens. Sans eux, impossible de dire lesquelles méritent qu'on continue.
 *
 * LE VOCABULAIRE EST CELUI DU SOCLE (`GESTES`), pas un de plus : dix-huit
 * applications partagent un projet PostHog, et le détail va dans une propriété
 * énumérée (`objet`, `format`, `nom`) — jamais dans le nom de l'événement. Une
 * vue « `creation` ventilée par `objet` » répond alors d'un coup.
 *
 * AUCUNE VALEUR LIBRE : seulement les constantes ci-dessous. Ni nom de schéma,
 * ni nom de joueur, ni texte d'étape — le socle crie en développement si une
 * espace passe.
 *
 * UNE FOIS PAR SESSION ET PAR GESTE, par défaut. La question est « combien de
 * séances d'utilisation se servent des zones », pas « combien de zones » : un
 * entraîneur qui trace vingt traits au feutre ne doit pas peser vingt fois plus
 * que celui qui en trace un. `once: false` pour ce qui se compte vraiment
 * (un match démarré, un match terminé).
 *
 * Rien ne part sans l'accord du bandeau : `trackEvent` se tait avant.
 */
export const USAGE = {
  zone: [CREATION, { objet: 'zone' }],
  curve: [CREATION, { objet: 'nage_courbe' }],
  variant: [CREATION, { objet: 'variante' }],
  word: [CREATION, { objet: 'mot' }],
  tag: [CREATION, { objet: 'etiquette' }],
  pen: [CREATION, { objet: 'trait_feutre' }],
  recording: [OPERATION, { nom: 'enregistrement_direct', etape: 'lancee' }],
  defense: [OPERATION, { nom: 'placement_defense', etape: 'reussie' }],
  versionRestored: [OPERATION, { nom: 'version', etape: 'reussie' }],
  follow: [CONSULTATION, { objet: 'nage_joueur' }],
  allPaths: [CONSULTATION, { objet: 'nages_phase' }],
  versions: [CONSULTATION, { objet: 'versions' }],
  playerLinkOpened: [CONSULTATION, { objet: 'lien_joueurs' }],
  seancePlayerLinkOpened: [CONSULTATION, { objet: 'lien_joueurs_seance' }],
  seancePresented: [CONSULTATION, { objet: 'seance' }],
  printSheet: [EXPORT, { format: 'impression', objet: 'fiche' }],
  printCarnet: [EXPORT, { format: 'impression', objet: 'carnet' }],
  playerLink: [EXPORT, { format: 'lien', objet: 'joueurs' }],
  seancePlayerLink: [EXPORT, { format: 'lien', objet: 'joueurs_seance' }],
  matchStarted: [PARTIE, { objet: 'match', etape: 'demarree' }],
  matchEnded: [PARTIE, { objet: 'match', etape: 'terminee' }],
} as const satisfies Record<
  string,
  readonly [Geste, Readonly<Record<string, string>>]
>;

export type Usage = keyof typeof USAGE;

const sent = new Set<Usage>();

/**
 * Note qu'une fonction a servi. Rend `true` si l'événement est parti (accord
 * donné, client chargé, pas déjà noté dans la session).
 */
export function noteUsage(
  usage: Usage,
  { once = true }: { once?: boolean } = {}
): boolean {
  if (once && sent.has(usage)) return false;
  const [name, params] = USAGE[usage];
  const ok = trackEvent(name, { ...params });
  // Noté seulement s'il est PARTI : un geste fait avant l'accord ne doit pas
  // empêcher le suivant, fait après, d'être compté.
  if (ok && once) sent.add(usage);
  return ok;
}

/** Pour les tests : oublie ce qui a été noté. */
export function resetUsageForTests(): void {
  sent.clear();
}
