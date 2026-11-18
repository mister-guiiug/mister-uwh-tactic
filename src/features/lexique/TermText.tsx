import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/index.ts';
import { Popover } from '../../ui/Popover.tsx';
import { linkTerms, termsIn, type Lang } from './link.ts';
import type { Term } from './terms.ts';

const useLang = (): Lang => (useI18n().locale === 'en' ? 'en' : 'fr');

/**
 * UN MOT DU LEXIQUE, À PORTÉE DE DOIGT : il ouvre sa définition, et un lien
 * vers le lexique entier. Un débutant bute sur les mots là où il lit la
 * phase — « sortie de mur », « couverture » —, pas sur l'écran Lexique.
 */
export function TermPopover({ term, label }: { term: Term; label?: string }) {
  const { t } = useI18n();
  const lang = useLang();
  const { term: name, definition } = term[lang];
  return (
    <Popover
      label={t('lexique.definitionOf', { term: name })}
      align="start"
      placement="above"
      className="uwh-term"
      trigger={props => (
        <button type="button" className="uwh-term__trigger" {...props}>
          {label ?? name}
        </button>
      )}
    >
      {close => (
        <div className="uwh-stack uwh-stack--tight">
          <p className="uwh-term__name">{name}</p>
          <p className="m-0">{definition}</p>
          <Link
            to={`/lexique?terme=${encodeURIComponent(term.id)}`}
            onClick={close}
          >
            {t('lexique.open')}
          </Link>
        </div>
      )}
    </Popover>
  );
}

/** Une consigne dont les mots du lexique s'ouvrent d'un toucher. */
export function TermText({ text }: { text: string }) {
  const lang = useLang();
  const segments = useMemo(() => linkTerms(text, lang), [text, lang]);
  return (
    <>
      {segments.map((segment, i) =>
        segment.term ? (
          <TermPopover key={i} term={segment.term} label={segment.text} />
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        )
      )}
    </>
  );
}

/**
 * SOUS LE CHAMP DE LA CONSIGNE : les mots du lexique qu'elle contient. Un
 * champ de saisie ne porte pas de lien ; la liste, si.
 */
export function TermsInNote({ text }: { text: string }) {
  const { t } = useI18n();
  const lang = useLang();
  const terms = useMemo(() => termsIn(text, lang), [text, lang]);
  if (terms.length === 0) return null;
  return (
    <p className="uwh-terms m-0">
      <span className="uwh-muted">{t('lexique.inNote')}</span>{' '}
      {terms.map((term, i) => (
        <Fragment key={term.id}>
          {i > 0 ? ' · ' : null}
          <TermPopover term={term} />
        </Fragment>
      ))}
    </p>
  );
}
