import { TAG_LIMITS } from './model.ts';

/**
 * LES ÉTIQUETTES D'UN SCHÉMA (ADR 0029).
 *
 * UNE ÉTIQUETTE PROPOSÉE SE RANGE SOUS UN IDENTIFIANT NEUTRE, pas sous son
 * nom : `attack`, jamais « Attaque ». Un schéma envoyé d'Espagne arrive en
 * France avec `attack`, et l'écran français lit « Attaque » là où l'espagnol
 * lisait « Ataque ». Une étiquette libre, elle, se range sous son texte, et
 * se lit telle qu'on l'a écrite, dans toutes les langues.
 *
 * Les proposées viennent du jeu et des exemples : l'engagement, l'attaque et
 * la défense, les phases arrêtées (coup franc, tir de pénalité, palet
 * neutre : le « coup de pied arrêté » d'un sport qui n'a pas de pied), le
 * jeu au mur, que trois exemples travaillent, et l'exercice.
 */
export const SUGGESTED_TAGS = [
  'kickoff',
  'attack',
  'defense',
  'setPiece',
  'wall',
  'drill',
] as const;
export type SuggestedTag = (typeof SUGGESTED_TAGS)[number];

export const isSuggestedTag = (tag: string): tag is SuggestedTag =>
  (SUGGESTED_TAGS as readonly string[]).includes(tag);

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * L'identifiant d'une proposée écrit autrement (« ATTACK », « set piece »)
 * redevient l'identifiant : une seule puce, un seul nom à l'écran.
 */
export const canonicalTag = (tag: string) =>
  SUGGESTED_TAGS.find(id => fold(id) === fold(tag).replace(/ /g, '')) ?? tag;

/**
 * La clé d'une étiquette, pour comparer : sans accents, sans casse, les
 * espaces réduites. « Pressing » et « pressing » sont la même étiquette.
 */
export const tagKey = (tag: string) => fold(canonicalTag(tag));

/**
 * Une étiquette lisible, ou `null` : du texte, les espaces réduites, coupé
 * à la longueur permise — sans laisser une moitié de caractère au bout.
 */
function cleanTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TAG_LIMITS.length)
    .replace(/[\uD800-\uDBFF]$/, '')
    .trim();
  return text === '' ? null : canonicalTag(text);
}

/**
 * LES ÉTIQUETTES TELLES QU'ON PEUT LES GARDER, quoi qu'on reçoive : un lien
 * forgé, un fichier retouché. Ce qui n'est pas du texte tombe, un doublon
 * aussi (à la casse et aux accents près), et au-delà de huit, le reste.
 * Le schéma zod ne refuse donc jamais un schéma pour ses étiquettes.
 */
export function cleanTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input) {
    const tag = cleanTag(raw);
    if (tag === null || seen.has(tagKey(tag))) continue;
    seen.add(tagKey(tag));
    tags.push(tag);
    if (tags.length === TAG_LIMITS.count) break;
  }
  return tags;
}

/**
 * CE QU'ON A TAPÉ, RANGÉ. Le nom d'une étiquette proposée dans la langue de
 * l'écran (« défense », « Defensa ») ou son identifiant donnent
 * l'identifiant neutre : il se lira dans la langue de chacun. Le reste est
 * une étiquette libre. `null` pour un texte vide.
 */
export function tagFromInput(
  text: string,
  labelOf: (tag: SuggestedTag) => string
): string | null {
  const tag = cleanTag(text);
  if (tag === null) return null;
  return SUGGESTED_TAGS.find(id => tagKey(labelOf(id)) === tagKey(tag)) ?? tag;
}

/** Le schéma porte-t-il cette étiquette ? À la casse et aux accents près. */
export const hasTag = (tags: readonly string[] | undefined, tag: string) =>
  (tags ?? []).some(t => tagKey(t) === tagKey(tag));

/**
 * Pose l'étiquette, ou la retire si elle y est déjà. Au-delà de huit, rien
 * ne change : l'écran le dit avant qu'on essaie.
 */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  if (hasTag(tags, tag)) return tags.filter(t => tagKey(t) !== tagKey(tag));
  return cleanTags([...tags, tag]);
}

/** Ce qui s'affiche : le nom d'une proposée dans la langue de l'écran. */
export const tagLabel = (tag: string, labels: Record<SuggestedTag, string>) =>
  isSuggestedTag(tag) ? labels[tag] : tag;
