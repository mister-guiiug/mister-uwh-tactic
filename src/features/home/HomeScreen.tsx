import { lazy, Suspense } from 'react';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { BoardScreen } from '../board/BoardScreen.tsx';
import { useNews } from '../nouveautes/store.ts';

/*
 * « QUOI DE NEUF » (ADR 0039) À LA DEMANDE : l'accueil ne porte que la
 * décision (`useNews`) et les textes français ; la carte et sa feuille de
 * style arrivent quand elle paraît. Mesuré le 23/11/2026 : préchargé
 * +0,8 kB ainsi, +1,3 kB la carte dans l'accueil ; le total paie 0,6 kB.
 */
const NewsCard = lazy(() =>
  import('../nouveautes/NewsCard.tsx').then(m => ({ default: m.NewsCard }))
);

/**
 * L'ACCUEIL, C'EST LE TABLEAU — suivi des deux éléments que la règle de la
 * famille veut sur l'accueil : la phrase qui dit ce que fait l'app, et le
 * pied de page (code source, soutien, signalement), sur l'accueil et À
 * propos, et nulle part ailleurs.
 *
 * LES DEUX SONT AU BAS DU PANNEAU depuis l'ADR 0017 : l'accueil tient dans
 * l'écran sans défiler, et le panneau défile seul. Au-dessus de l'espace de
 * travail, la phrase repoussait le bassin hors du premier écran (ADR 0016) ;
 * dessous, elle faisait défiler la page. Un moteur la lit toujours — dans la
 * page servie, où le socle pose la description, comme dans celle que rend
 * React.
 *
 * « QUOI DE NEUF » (ADR 0039), pour qui revient, au-dessus du terrain.
 *
 * Le fichier garde le nom `HomeScreen` : c'est à lui que `pwa-doctor`
 * reconnaît l'accueil (`liens-famille`), comme dans tout le parc.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const news = useNews(s => s.shown);
  return (
    <BoardScreen
      notice={
        news ? (
          <Suspense fallback={null}>
            <NewsCard />
          </Suspense>
        ) : undefined
      }
      aside={
        <>
          <p className="uwh-muted m-0 text-supporting">{t('app.tagline')}</p>
          <AppFooter repoUrl={REPO_URL} issues />
        </>
      }
    />
  );
}
