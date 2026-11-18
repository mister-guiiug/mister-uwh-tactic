import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../i18n/index.ts';
import { TERM_GROUPS, TERMS } from './terms.ts';

/** « tir lateral » trouve « Tir latéral » : sans accents ni casse. */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

/**
 * LE LEXIQUE : les mots du bord du bassin, rangés en quatre familles — les
 * gestes, le jeu collectif, les postes, les règles. Une recherche sans
 * accents filtre le terme comme sa définition.
 *
 * Une liste de définitions (`dl`), pas des cartes : Astryx réserve la carte
 * aux objets discrets (ADR 0017). Les termes et leurs définitions, réécrites
 * d'après les documents de formation, sont dans `terms.ts`.
 */
export function LexiqueScreen() {
  const { t, m, locale } = useI18n();
  const lang = locale === 'en' ? 'en' : 'fr';
  // `?terme=<id>` : ouvert depuis une consigne, le lexique montre ce mot.
  const [params] = useSearchParams();
  const [query, setQuery] = useState(
    () => TERMS.find(term => term.id === params.get('terme'))?.[lang].term ?? ''
  );
  const shown = useMemo(() => {
    const wanted = fold(query.trim());
    return wanted
      ? TERMS.filter(term =>
          fold(`${term[lang].term} ${term[lang].definition}`).includes(wanted)
        )
      : TERMS;
  }, [query, lang]);

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0">{t('lexique.intro')}</p>
      <TextField
        type="search"
        label={t('lexique.search')}
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      {TERM_GROUPS.map(group => {
        const items = shown.filter(term => term.group === group);
        if (items.length === 0) return null;
        return (
          <section
            key={group}
            className="uwh-lexique"
            aria-labelledby={`uwh-lexique-${group}`}
          >
            <h2 id={`uwh-lexique-${group}`} className="uwh-lexique__title">
              {m.lexique.groups[group]}
            </h2>
            <dl className="uwh-lexique__list">
              {items.map(term => (
                <div key={term.id} className="uwh-lexique__entry">
                  <dt>{term[lang].term}</dt>
                  <dd>{term[lang].definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {shown.length === 0 ? (
        <p className="m-0" role="status">
          {t('lexique.none', { query })}
        </p>
      ) : null}
      <p className="uwh-muted m-0 text-supporting">{t('lexique.sources')}</p>
    </div>
  );
}
