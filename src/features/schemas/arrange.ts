import type { Tactic } from '../board/model.ts';

export type Sort = 'recent' | 'name' | 'steps';

/** « Sortie de but » se trouve en tapant « sortie de but » ou « SORTIE ». */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

/**
 * La bibliothèque filtrée et triée. Le tri par nom suit la langue (« É »
 * avec les « E ») ; les schémas sans nom vont à la fin.
 */
export function arrange(
  schemas: readonly Tactic[],
  query: string,
  sort: Sort,
  locale: string
): Tactic[] {
  const wanted = fold(query.trim());
  const shown = wanted
    ? schemas.filter(s => fold(s.name).includes(wanted))
    : [...schemas];
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
