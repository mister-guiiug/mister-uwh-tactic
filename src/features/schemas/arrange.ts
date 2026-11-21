import type { Tactic } from '../board/model.ts';
import {
  canonicalTag,
  hasTag,
  isSuggestedTag,
  SUGGESTED_TAGS,
  tagKey,
} from '../board/tags.ts';

export type Sort = 'recent' | 'name' | 'steps';

/** « Sortie de but » se trouve en tapant « sortie de but » ou « SORTIE ». */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

/**
 * La bibliothèque filtrée et triée. Le tri par nom suit la langue (« É »
 * avec les « E ») ; les schémas sans nom vont à la fin. `tag` ne garde que
 * les schémas qui portent cette étiquette (ADR 0029), en plus de la
 * recherche.
 */
export function arrange(
  schemas: readonly Tactic[],
  query: string,
  sort: Sort,
  locale: string,
  tag: string | null = null
): Tactic[] {
  const wanted = fold(query.trim());
  const shown = schemas.filter(
    s =>
      (!wanted || fold(s.name).includes(wanted)) &&
      (tag === null || hasTag(s.tags, tag))
  );
  if (sort === 'name') {
    const collator = new Intl.Collator(locale, { sensitivity: 'base' });
    shown.sort((a, b) =>
      !a.name ? 1 : !b.name ? -1 : collator.compare(a.name, b.name)
    );
  } else if (sort === 'steps') {
    shown.sort((a, b) => b.steps.length - a.steps.length);
  }
  return shown;
}

/**
 * LES ÉTIQUETTES PRÉSENTES DANS LA BIBLIOTHÈQUE, une puce chacune : les
 * proposées dans leur ordre, puis les libres dans l'ordre alphabétique de la
 * langue. « Pressing » et « pressing » n'en font qu'une, sous la première
 * écriture rencontrée.
 */
export function tagsIn(schemas: readonly Tactic[], locale: string): string[] {
  const free = new Map<string, string>();
  const suggested = new Set<string>();
  for (const schema of schemas) {
    for (const tag of (schema.tags ?? []).map(canonicalTag)) {
      if (isSuggestedTag(tag)) suggested.add(tag);
      else if (!free.has(tagKey(tag))) free.set(tagKey(tag), tag);
    }
  }
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  return [
    ...SUGGESTED_TAGS.filter(tag => suggested.has(tag)),
    ...[...free.values()].sort(collator.compare),
  ];
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * LE NOM D'UNE COPIE, sans parenthèses empilées : « Contre (copie) », puis
 * « Contre (copie 2) », « Contre (copie 3) »… La copie d'une copie repart du
 * nom d'origine. L'audit du 18/11/2026 relevait « (copie) (copie) ».
 *
 * `label(n)` rend le suffixe dans la langue de l'écran — sans `n` pour la
 * première copie. Le nom tient en 60 caractères, comme le champ.
 */
export function copyNameFor(
  name: string,
  taken: readonly string[],
  label: (n?: number) => string
): string {
  const nth = new RegExp(`\\s*${escapeRegExp(label(0)).replace('0', '\\d+')}$`);
  const once = new RegExp(`\\s*${escapeRegExp(label())}$`);
  const base = name.replace(nth, '').replace(once, '').trim();
  const used = new Set(taken);
  for (let n = 1; ; n += 1) {
    const candidate = `${base} ${n === 1 ? label() : label(n)}`
      .trim()
      .slice(0, 60);
    if (!used.has(candidate) || n > 999) return candidate;
  }
}
