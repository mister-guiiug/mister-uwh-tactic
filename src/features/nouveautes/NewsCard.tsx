import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../i18n/index.ts';
import { useUiMode } from '../board/mode.ts';
import { LOT } from './model.ts';
import { newsFor } from './news.ts';
import { useNews } from './store.ts';
import './nouveautes.css';

/**
 * UN ÉCRAN ÉTROIT OU BAS, l'un suffit. Le téléphone court d'abord (Safari sur
 * iPhone, Chrome sur un 360 × 780 : 650 à 665 px visibles) : mesuré sur un
 * 375 × 667 en mode complet, la carte dépliée laissait 44 px au terrain. Mais
 * aussi la tablette en paysage, l'écran du bord du bassin : à 1 024 × 768, la
 * carte dépliée prenait 194 px de haut au tableau, qui se règle sur la
 * hauteur. Dépliée d'office, seulement là où la place ne manque pas.
 */
const CRAMPED = '(max-width: 47.99rem), (max-height: 50rem)';

/**
 * LA CARTE « QUOI DE NEUF » (ADR 0039) : un titre, une croix, et une ligne
 * par nouveauté, qui est un lien vers l'endroit où l'on s'en sert. Le lien
 * est la ligne entière : son nom est son texte, et la cible fait toute la
 * largeur, au doigt comme au lecteur d'écran.
 *
 * Suivre un lien ne la ferme pas : on revient essayer la suivante. La croix,
 * elle, règle le lot (`useNews`).
 *
 * UNE LIGNE SUR UN TÉLÉPHONE COURT, comme le guide de la première phase
 * (21/11/2026) : le titre devient un bouton qui déplie la liste
 * (`aria-expanded`). Le terrain garde sa hauteur tant qu'on ne la demande pas.
 *
 * Une surface du socle (`Card`, `CardHeader`), habillée par `components.css` ;
 * le lien prend `.uwh-link`, la teinte d'accent de l'application, AA sur la
 * surface en clair comme en sombre.
 */
export function NewsCard() {
  const { t } = useI18n();
  const { mode } = useUiMode();
  const close = useNews(s => s.close);
  const cramped = useMediaQuery(CRAMPED);
  const [unfolded, setUnfolded] = useState<boolean | null>(null);
  const open = unfolded ?? !cramped;
  const titleId = useId();
  const listId = useId();

  // LA MESURE DIT SI LA CARTE SERT : quel lien, ou la croix. Rien de
  // personnel ; rien ne part sans consentement. Sous un geste DU SOCLE
  // (`consultation`, `objet`), comme `app/usage.ts` : pas un nom
  // d'événement de plus dans le projet PostHog que partage le parc.
  const measure = (geste: 'fermee' | 'lien', nouveaute?: string) =>
    trackEvent('consultation', {
      objet: 'nouveautes',
      lot: LOT,
      geste,
      ...(nouveaute ? { nouveaute } : {}),
    });

  const title = <span id={titleId}>{t('news.title')}</span>;

  return (
    <Card as="section" className="uwh-news" aria-labelledby={titleId}>
      <CardHeader
        title={
          cramped ? (
            <button
              type="button"
              className="uwh-news__toggle"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setUnfolded(!open)}
            >
              {title}
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          ) : (
            title
          )
        }
        action={
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={t('news.close')}
            onClick={() => {
              measure('fermee');
              close();
            }}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        }
      />
      <ul id={listId} className="uwh-news__list" hidden={!open}>
        {newsFor(mode === 'simple').map(news => (
          <li key={news.id}>
            <Link
              to={news.to}
              state={news.state}
              // Une fonction ouverte sur le tableau, où l'on est déjà : pas
              // une page de plus dans l'historique.
              replace={news.state !== undefined}
              className="uwh-link uwh-news__link"
              onClick={() => measure('lien', news.id)}
            >
              {t(`news.${news.id}`)}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
