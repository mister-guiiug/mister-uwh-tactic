import type { Term } from './terms.ts';

export type Lang = 'fr' | 'en';

/** Un morceau de consigne : du texte, ou un mot du lexique. */
export interface Segment {
  text: string;
  term?: Term;
}

/**
 * LES MOTS PAR LESQUELS UN TERME SE RECONNAÎT. Le nom du terme, découpé là
 * où il en réunit plusieurs (« Passe longue, passe courte », « AG, AC, AD —
 * les avants »). Les morceaux de moins de quatre lettres sont écartés : un
 * sigle comme « AD » se lirait dans trop de mots, et un faux lien enseigne
 * le mauvais sens.
 */
const keysOf = (term: Term, lang: Lang) =>
  term[lang].term
    .split(/\s*,\s*|\s+—\s+/)
    .map(part => lower(part.trim()))
    .filter(part => part.replace(/[^\p{L}]/gu, '').length >= 4);

/**
 * Minuscules et apostrophe typographique ramenée à la droite. LES ACCENTS
 * COMPTENT, à dessein : « il se retourne » n'est pas le geste « Retourné ».
 * Chaque caractère garde sa place, donc les positions restent celles du
 * texte d'origine.
 */
const lower = (text: string) =>
  [...text]
    .map(ch => {
      const low = ch.toLocaleLowerCase('fr');
      return low.length === ch.length ? low : ch;
    })
    .join('')
    .replace(/’/g, "'");

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

type Keys = { key: string; term: Term }[];
const keysCache = new WeakMap<readonly Term[], Map<Lang, Keys>>();

/** Les clés de tous les termes, la plus longue d'abord. */
function allKeys(terms: readonly Term[], lang: Lang) {
  let byLang = keysCache.get(terms);
  if (!byLang) {
    byLang = new Map();
    keysCache.set(terms, byLang);
  }
  let keys = byLang.get(lang);
  if (!keys) {
    keys = terms.flatMap(term =>
      keysOf(term, lang).map(key => ({ key, term }))
    );
    keys.sort((a, b) => b.key.length - a.key.length);
    byLang.set(lang, keys);
  }
  return keys;
}

/**
 * LA CONSIGNE, DÉCOUPÉE AUTOUR DES MOTS DU LEXIQUE. Un terme n'est relié
 * qu'une fois par consigne — à sa première apparition —, le plus long
 * l'emporte quand deux se chevauchent, et un mot n'est reconnu qu'entier
 * (« écran » oui, « écrans » aussi, « écranter » non).
 */
export function linkTerms(
  text: string,
  lang: Lang,
  terms: readonly Term[]
): Segment[] {
  const source = text.normalize('NFC');
  const haystack = lower(source);
  const taken: { start: number; end: number; term: Term }[] = [];
  const linked = new Set<string>();

  for (const { key, term } of allKeys(terms, lang)) {
    if (linked.has(term.id)) continue;
    let from = 0;
    while (from <= haystack.length) {
      const at = haystack.indexOf(key, from);
      if (at < 0) break;
      let end = at + key.length;
      // Le pluriel : « relais » est déjà au pluriel, « écran » prend un s.
      if (haystack[end] === 's' || haystack[end] === 'x') {
        if (!isWordChar(haystack[end + 1])) end += 1;
      }
      const whole = !isWordChar(haystack[at - 1]) && !isWordChar(haystack[end]);
      const free = taken.every(t => end <= t.start || at >= t.end);
      if (whole && free) {
        taken.push({ start: at, end, term });
        linked.add(term.id);
        break;
      }
      from = at + 1;
    }
  }

  taken.sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, term } of taken) {
    if (start > cursor) segments.push({ text: source.slice(cursor, start) });
    segments.push({ text: source.slice(start, end), term });
    cursor = end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor) });
  return segments;
}

/** Les termes d'une consigne, dans l'ordre où ils paraissent. */
export function termsIn(
  text: string,
  lang: Lang,
  terms: readonly Term[]
): Term[] {
  return linkTerms(text, lang, terms).flatMap(segment =>
    segment.term ? [segment.term] : []
  );
}
