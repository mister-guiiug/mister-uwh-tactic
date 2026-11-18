import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import {
  BookOpen,
  CircleUserRound,
  Ellipsis,
  FolderOpen,
  Info,
  ClipboardList,
  NotebookPen,
  Settings,
  Waves,
} from 'lucide-react';
import { AppShell } from '@mister-guiiug/dev-pwa-config/react/app-shell';
import { ObservabilityBoundary } from '@mister-guiiug/dev-pwa-config/react/error-boundary';
import { ConnectionBanner } from '@mister-guiiug/dev-pwa-config/react/connection-banner';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { AppUpdates } from '@mister-guiiug/dev-pwa-config/react/app-updates';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { registerSW } from 'virtual:pwa-register';
import { useI18n } from './i18n/index.ts';
import { HomeScreen } from './features/home/HomeScreen.tsx';
import { SchemasScreen } from './features/schemas/SchemasScreen.tsx';
import { CommandPalette } from './features/palette/CommandPalette.tsx';
import { PlusScreen } from './features/plus/PlusScreen.tsx';
import { useChromeMetrics } from './app/useChromeMetrics.ts';

/**
 * LE CADRE : `AppShell` du socle (en-tête, contenu borné, barre basse).
 *
 * PROMU, PAS INVENTÉ. Ce fichier assemblait déjà `AppHeader` + `PageContainer`
 * + `BottomNav` + le lien d'évitement — le socle a remonté la composition.
 *
 * LE PIED DE PAGE N'EST PAS ICI, ET C'EST LA RÈGLE. Rendu dans la coquille,
 * hors des routes, `<AppFooter>` suivait chaque écran — trois liens sortants
 * sous une saisie. La règle famille du 06/09/2026 le veut sur deux écrans, et
 * deux seulement : l'accueil et À propos — c'est là qu'il est rendu, une ligne
 * dans chacun. `pwa-doctor` (`liens-famille`) refuse la coquille depuis.
 *
 * `linkComponent={Link}` avec `hrefProp="to"` : les composants de navigation
 * sont agnostiques de routeur, et c'est ainsi qu'on leur donne celui de l'app.
 * Un `<BottomNav />` sans `items` rend une barre VIDE — c'est le piège que la
 * campagne d'adoption a rencontré, et il ne produit aucune erreur de type.
 *
 * `navCurrentPath={pathname}` : le chemin du ROUTEUR, relatif à la base. Sans
 * lui, la barre lit `location.pathname`, qui vaut `/mister-uwh-tactic/` une fois
 * déployé quand l'entrée vaut `/` : aucun onglet n'était actif en ligne, jamais
 * en développement ni en e2e, servis sous `/`. Relevé le 03/10/2026 ; la prop
 * existe depuis le socle 6.23.0.
 *
 * Exporté pour `App.nav.test.tsx`, qui le monte sous un `basename`.
 */
/*
 * LES ÉCRANS QU'ON OUVRE MOINS, EN MORCEAUX À PART : notes, séances,
 * lexique, réglages, compte, à propos. Le tableau et la bibliothèque restent
 * dans l'accueil — on y arrive. Sans ce découpage, le lexique relié aux
 * consignes, les séances et la palette faisaient passer le chargé à
 * l'ouverture de 232,9 à 240 kB pour un budget de 246 (18/11/2026).
 *
 * LE MÊME THUNK pour `lazy()` et pour le préchargement au repos : un seul
 * morceau, déjà là au premier clic (et dans le précache, donc hors ligne).
 */
const screens = {
  notes: () => import('./features/notes/NotesScreen.tsx'),
  seances: () => import('./features/seances/SeancesScreen.tsx'),
  lexique: () => import('./features/lexique/LexiqueScreen.tsx'),
  settings: () => import('./features/settings/SettingsScreen.tsx'),
  account: () => import('./features/account/AccountScreen.tsx'),
  about: () => import('./features/about/AboutScreen.tsx'),
};
const NotesScreen = lazy(() =>
  screens.notes().then(m => ({ default: m.NotesScreen }))
);
const SeancesScreen = lazy(() =>
  screens.seances().then(m => ({ default: m.SeancesScreen }))
);
const LexiqueScreen = lazy(() =>
  screens.lexique().then(m => ({ default: m.LexiqueScreen }))
);
const SettingsScreen = lazy(() =>
  screens.settings().then(m => ({ default: m.SettingsScreen }))
);
const AccountScreen = lazy(() =>
  screens.account().then(m => ({ default: m.AccountScreen }))
);
const AboutScreen = lazy(() =>
  screens.about().then(m => ({ default: m.AboutScreen }))
);
const loadScreens = () =>
  Promise.all(Object.values(screens).map(load => load()));

export function Shell() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  useIdlePrefetch(loadScreens);

  /*
   * UNE VUE DE PAGE PAR NAVIGATION — ni zéro, ni deux. PostHog en envoie une
   * au chargement ET à chaque changement d'historique quand on le laisse
   * faire ; les apps du parc étant en `HashRouter`, chaque navigation serait
   * comptée DEUX fois. `initAnalytics` pose donc `capture_pageview: false`
   * pour que toutes passent par ici, la première comprise. Sans ce hook, à
   * l'inverse, la navigation d'une PWA est invisible et la durée de session
   * fausse.
   *
   * Il ne fait rien tant que le consentement n'est pas accordé : il se monte
   * donc sans condition.
   */
  usePageViews(pathname);

  // La hauteur de l'en-tête et de la barre basse, mesurée pour l'espace de
  // travail du tableau (ADR 0016).
  useChromeMetrics();

  /*
   * TROIS RÉGIONS DÈS 1 024 PX (ADR 0017) : le rail, le terrain, le panneau.
   * Le rail a la hauteur de l'écran : ce qu'on ouvre rarement s'y range en
   * pied, et « Plus » n'a plus de raison d'être.
   */
  const wide = useMediaQuery('(min-width: 64rem)');

  /*
   * QUATRE ENTRÉES AU TÉLÉPHONE (ADR 0016). Trois servent à chaque
   * entraînement — le tableau, la bibliothèque, les séances (ADR 0018, à la
   * place des notes du squelette) ; la quatrième, « Plus », range ce qu'on
   * ouvre moins : notes, lexique, réglages, compte, à propos. Sur grand
   * écran, ceux-là descendent au pied du rail (ADR 0017).
   */
  const daily = [
    {
      href: '/',
      label: t('nav.home'),
      icon: <Waves aria-hidden="true" />,
      end: true,
    },
    {
      href: '/schemas',
      label: t('nav.schemas'),
      icon: <FolderOpen aria-hidden="true" />,
    },
    {
      href: '/seances',
      label: t('nav.seances'),
      icon: <ClipboardList aria-hidden="true" />,
    },
  ];
  const nav = wide
    ? [
        ...daily,
        {
          href: '/notes',
          label: t('nav.notes'),
          icon: <NotebookPen aria-hidden="true" />,
          // Le premier du pied : `margin-block-start: auto` dans le rail.
          className: 'uwh-nav-foot',
        },
        {
          href: '/lexique',
          label: t('lexique.title'),
          icon: <BookOpen aria-hidden="true" />,
        },
        {
          href: '/reglages',
          label: t('settings.title'),
          icon: <Settings aria-hidden="true" />,
        },
        {
          href: '/compte',
          label: t('account.title'),
          icon: <CircleUserRound aria-hidden="true" />,
        },
        {
          href: '/a-propos',
          label: t('about.title'),
          icon: <Info aria-hidden="true" />,
        },
      ]
    : [
        ...daily,
        {
          href: '/plus',
          label: t('nav.more'),
          icon: <Ellipsis aria-hidden="true" />,
        },
      ];

  /*
   * « Plus » reste l'onglet courant sur les écrans qu'il range, et c'est là
   * que ramène leur bouton retour. Le chemin passé à la barre ne sert qu'à
   * ce marquage ; le routeur, lui, garde le vrai.
   */
  const underPlus =
    !wide &&
    ['/notes', '/lexique', '/reglages', '/compte', '/a-propos'].includes(
      pathname
    );

  /*
   * L'ACCUEIL, C'EST AUSSI LE REPLI DE ROUTE (`*`) : une adresse inconnue
   * rend le tableau, et doit avoir sa coquille — sinon l'en-tête revient et
   * la page défile.
   */
  const home =
    !pathname.startsWith('/seances') &&
    ![
      '/schemas',
      '/notes',
      '/reglages',
      '/compte',
      '/a-propos',
      '/plus',
      '/lexique',
    ].includes(pathname);

  /*
   * L'ACCUEIL PORTE LE NOM DE L'APP, PAS CELUI DE SON PREMIER ÉCRAN. C'est le
   * seul `h1` que lit un moteur, et le premier que voit un visiteur. Relevé du
   * 23/09/2026 dans un navigateur vierge : le squelette y titrait « Notes »,
   * et trois apps du parc avaient hérité du même travers — « Mes espaces »,
   * « Connexion », le nom du dépôt. Le titre de l'écran descend d'un cran,
   * en `h2`, dans `BoardScreen`, que rend `HomeScreen`.
   */
  const titles: Record<string, string> = {
    '/': t('app.name'),
    '/schemas': t('schemas.title'),
    '/notes': t('notes.title'),
    '/seances': t('seances.title'),
    '/reglages': t('settings.title'),
    '/compte': t('account.title'),
    '/a-propos': t('about.title'),
    '/plus': t('plus.title'),
    '/lexique': t('lexique.title'),
  };

  return (
    <AppShell
      title={
        titles[pathname] ??
        (pathname.startsWith('/seances/') ? t('seances.title') : t('app.name'))
      }
      // PAS DE RETOUR SUR UN PREMIER NIVEAU (ADR 0017) : on vient de la
      // barre, on y retourne. Seuls les écrans rangés sous « Plus » en ont
      // un, et une séance ouverte, qui ramène à la liste.
      backHref={
        underPlus
          ? '/plus'
          : pathname.startsWith('/seances/')
            ? '/seances'
            : undefined
      }
      // LE THÈME QUITTE LES EN-TÊTES : il est dans Réglages. Le bouton,
      // répété sur chaque écran, prenait la place d'une vraie action.
      actions={null}
      // SUR LE TABLEAU, LA BARRE DU SCHÉMA EST LA SEULE BARRE : l'en-tête
      // reste dans la page, pour le titre que lisent les moteurs et les
      // lecteurs d'écran, mais ne se voit plus — il prenait 61 px pour
      // redire le nom de l'application (audit du 18/11/2026).
      className={home ? 'uwh-shell uwh-shell--board' : 'uwh-shell'}
      linkComponent={Link}
      hrefProp="to"
      // LE TABLEAU ET LA BIBLIOTHÈQUE PRENNENT TOUTE LA LARGEUR : sur un
      // écran de 1 440 px, la grille plafonnait à 620 px (audit du
      // 18/11/2026). Les autres écrans gardent la colonne de lecture.
      width={home || pathname === '/schemas' ? 'full' : undefined}
      navItems={nav}
      navCurrentPath={underPlus ? '/plus' : pathname}
      // HUIT ENTRÉES VISIBLES SUR LE RAIL (le lexique, puis les séances) :
      // sans elle, la barre replie tout ce qui dépasse cinq sous « Plus ». Jusqu'au socle 6.36.0, `AppShell`
      // ne transmettait pas l'option, et l'app rendait sa barre à part, dans
      // `beforeMain` (ADR 0017).
      navMaxVisible={8}
      beforeMain={
        <>
          <ConnectionBanner />
          <CommandPalette />
        </>
      }
      afterMain={
        /*
          LE BANDEAU DE CONSENTEMENT, DANS LE FLUX DU CONTENU. Une `region`,
          pas une boîte modale : il ne recouvre rien, ne piège pas le focus, et
          l'application reste utilisable derrière. Obtenir un consentement en
          bloquant l'écran est la figure que le RGPD appelle un « dark
          pattern ».

          IL NE REND RIEN tant que `VITE_POSTHOG_KEY` n'est pas posée sur le
          dépôt : sans clé il n'y a rien à mesurer, donc rien à demander. Une app
          engendrée depuis ce squelette part donc muette, et poser la variable
          est le seul geste qui l'allume.

          LE `loader` N'EST PAS FACULTATIF EN PRATIQUE, et c'est le piège de
          cette prop. Sans lui, le socle retombe sur un spécificateur
          volontairement non analysable (`['posthog','js'].join('-')`) — utile
          pour qu'une app SANS `posthog-js` construise quand même, mais dans un
          bundle servi au navigateur cet import ne se résout pas. Le socle
          l'attrape et se tait : le bandeau s'affiche, l'accord est donné, et
          RIEN NE PART. C'est exactement le défaut « câblé mais muet » que ce
          parc a déjà payé. Le passer rend l'import analysable par Vite, qui
          émet le morceau et le charge à l'accord — pas avant.

          ET C'EST LA BUILD `slim`, PAS L'ENTRÉE PAR DÉFAUT. Mesuré le
          19/09/2026 : 50,1 kB gzip contre 97,6 pour `posthog-js` tout court.
          Ce qu'elle laisse dehors — enregistrement de session, autocapture,
          sondages, barre d'outils, capture d'exceptions — est exactement ce
          que l'ADR 0012 a DÉCIDÉ de couper, et que le socle éteint déjà par
          `OPTIONS_VIE_PRIVEE`. L'éteindre par une option et ne pas l'embarquer
          du tout ne se valent pas : une option se rallume, un code absent non.
          Le chemin passe par `dist/` faute de table `exports` dans le paquet ;
          s'il changeait, le build casserait — bruyamment, ce qui est le bon
          sens de l'échec ici.
        */
        <ConsentBanner
          posthogKey={import.meta.env.VITE_POSTHOG_KEY}
          loader={() => import('posthog-js/dist/module.slim.js')}
        />
      }
    >
      <Suspense
        fallback={<SkeletonGroup label={t('app.loadingScreen')} lines={4} />}
      >
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/schemas" element={<SchemasScreen />} />
          <Route path="/notes" element={<NotesScreen />} />
          <Route path="/seances" element={<SeancesScreen />} />
          <Route path="/seances/:id" element={<SeancesScreen />} />
          <Route path="/reglages" element={<SettingsScreen />} />
          <Route path="/compte" element={<AccountScreen />} />
          <Route path="/a-propos" element={<AboutScreen />} />
          <Route path="/plus" element={<PlusScreen />} />
          <Route path="/lexique" element={<LexiqueScreen />} />
          {/* Le repli de route rend l'accueil ; le repli de SERVEUR est le
            `404.html` posé par `spaFallbackPlugin`. Les deux sont
            nécessaires : sans le second, GitHub Pages sert sa propre page
            d'erreur avant que ce routeur n'existe. */}
          <Route path="*" element={<HomeScreen />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <ObservabilityBoundary>
      {/* `registerType: 'prompt'` : une nouvelle version ne recharge JAMAIS la
          page toute seule. Trois apps du parc étaient en `autoUpdate` et
          pouvaient recharger au milieu d'une saisie. `checkEvery` fait
          découvrir une version à une PWA installée restée ouverte plusieurs
          jours, qui autrement ne verrait rien avant un démarrage à froid. */}
      <AppUpdates registerSW={registerSW} checkEvery="1h">
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Shell />
        </BrowserRouter>
      </AppUpdates>
    </ObservabilityBoundary>
  );
}
