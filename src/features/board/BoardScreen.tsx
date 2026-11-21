import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { Eraser, Highlighter, Megaphone, Minimize2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { useWakeLock } from '@mister-guiiug/dev-pwa-config/react/use-wake-lock';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { useI18n } from '../../i18n/index.ts';
import { useSchemas } from '../schemas/store.ts';
import { Board2D } from './Board2D.tsx';
import { PrintSheet } from './PrintSheet.tsx';
import { apneaTable, overLimit } from './apnea.ts';
import { alertedSteps, stepAlerts } from './checks.ts';
import { playerTitle, useBoardLabels } from './labels.ts';
import { kickoffStep, type Decision } from './model.ts';
import { useUiMode } from './mode.ts';
import { useSaveState } from './saveState.ts';
import { decodeShared, sharedCodeFromHash } from './share.ts';
import { boardStore, useBoard } from './store.ts';
import type { CameraPreset } from './scene3d.ts';
import {
  BoardToolbar,
  type Tool,
  type View,
} from './workspace/BoardToolbar.tsx';
import { ContextPanel, type SheetState } from './workspace/ContextPanel.tsx';
import { LayersPopover } from './workspace/LayersPopover.tsx';
import { TermText } from '../lexique/TermText.tsx';
import { useSeancePlay } from '../seances/play.ts';
import { useDescribeStep } from './useDescribeStep.ts';
import { PresentMarker } from './workspace/PresentMarker.tsx';
import { usePrinting } from '../../app/usePrinting.ts';
import { INSPECTOR_NAME_ID, type PanelTab } from './workspace/panelTabs.ts';
import { SelectionBar } from './workspace/SelectionBar.tsx';
import { SimpleBar } from './workspace/SimpleBar.tsx';
import { SimpleFeedback } from './workspace/SimpleFeedback.tsx';
import { GUIDE_KEY, SimpleGuide } from './workspace/SimpleGuide.tsx';
import { useGuideProgress } from './workspace/guide.ts';
import { StepTimeline } from './workspace/StepTimeline.tsx';
import { WorkspaceBar } from './workspace/WorkspaceBar.tsx';
import { StepPanel } from './panels/StepPanel.tsx';
import { offerEffectif, useEffectifOffer } from '../effectif/offer.ts';

/**
 * LA 3D EST UN MORCEAU À PART. three.js pèse plus que tout le reste de
 * l'application ; il ne bloque pas l'ouverture de l'accueil.
 *
 * LE MÊME THUNK pour `lazy()` et pour le préchargement : deux `import()`
 * écrits séparément finissent par viser deux chemins. Précharger au repos ne
 * coûte rien de plus — le service worker télécharge déjà ce morceau pour son
 * précache — et rend la bascule en 3D instantanée.
 */
const loadPool3D = () => import('./Pool3D.tsx');

/** Le panneau : à côté du terrain, ou feuille du bas au téléphone. */
const PANEL_ID = 'uwh-panel';
const Pool3D = lazy(loadPool3D);

/**
 * LES ONGLETS SECONDAIRES ET LE MENU, à la demande (`panels/secondary.ts`) :
 * un seul morceau, le même thunk pour `lazy()` et pour le préchargement au
 * repos. L'onglet « Étape », celui d'ouverture (ADR 0017), reste dans
 * l'accueil ; l'inspecteur du jeton attend qu'on touche un joueur.
 */
const loadSecondary = () => import('./panels/secondary.ts');
const Inspector = lazy(() =>
  loadSecondary().then(m => ({ default: m.Inspector }))
);
const TeamsPanel = lazy(() =>
  loadSecondary().then(m => ({ default: m.TeamsPanel }))
);
const RulesPanel = lazy(() =>
  loadSecondary().then(m => ({ default: m.RulesPanel }))
);
const ApneaPanel = lazy(() =>
  loadSecondary().then(m => ({ default: m.ApneaPanel }))
);
const PoolPanel = lazy(() =>
  loadSecondary().then(m => ({ default: m.PoolPanel }))
);
const ActionsMenu = lazy(() =>
  loadSecondary().then(m => ({ default: m.ActionsMenu }))
);
// La barre de séance, et avec elle la bibliothèque des séances : seulement
// quand une séance se présente. Dans le morceau secondaire plutôt que dans
// le sien : mesuré le 20/11/2026, 238,5 kB préchargés contre 238,9 (morceau
// à part) et 239,5 (dans l'accueil).
const SeanceNav = lazy(() =>
  loadSecondary().then(m => ({ default: m.SeanceNav }))
);
// « Appliquer mon effectif ? » (ADR 0028) : seulement quand un schéma arrive.
const EffectifOffer = lazy(() =>
  loadSecondary().then(m => ({ default: m.EffectifOffer }))
);
/**
 * LE PLEIN ÉCRAN, en quelques lignes plutôt que par `react/use-fullscreen`,
 * que le socle publie encore comme expérimental (`pwa-doctor` le signale).
 */
function useFullscreenState() {
  const supported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );
  useEffect(() => {
    const sync = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  return {
    supported,
    active,
    enter: async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Refusé (iOS, iframe) : la présentation reste dans la page.
      }
    },
    exit: async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
    },
  };
}

/** Espace active un bouton, un lien, une case : on ne le lui vole pas. */
const isNativeControl = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('button, a[href], summary, [role="tab"], [role="switch"]');

/**
 * UNE FEUILLE OUVERTE (menu, QR, vidéo, « À toi de jouer ») GARDE SES
 * TOUCHES, toutes : le tableau caché derrière ne répond plus. On cherche la
 * feuille dans la page, pas autour de la cible : un toucher sur le terrain
 * du jeu, qui ne prend pas le focus, laisse la cible sur <body> — et Ctrl+Z
 * annulait alors, en silence, la dernière retouche du tableau.
 */
const sheetOpen = () => document.querySelector('[data-dwc="sheet"]') !== null;

/** Une saisie en cours ne se fait pas voler Ctrl+Z par le tableau. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * L'ESPACE DE TRAVAIL (ADR 0016) : la barre du schéma, le tableau à la
 * hauteur de l'écran avec ses commandes, la frise des étapes épinglée
 * dessous, et le panneau contextuel — à droite sur grand écran, sous la
 * frise sur un téléphone.
 *
 * L'accroche et le pied de page appartiennent à l'accueil
 * (`features/home/HomeScreen.tsx`), qui les passe en `aside` : ils se
 * rangent au bas du panneau, pour que l'accueil tienne dans l'écran sans
 * défiler (ADR 0017).
 */
export function BoardScreen({ aside }: { aside?: ReactNode }) {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const playing = useBoard(s => s.playing);
  const selected = useBoard(s => s.selected);
  const actions = useMemo(() => boardStore.getState(), []);
  const saveSchema = useSchemas(s => s.save);
  const saveState = useSaveState();

  const wide = useMediaQuery('(min-width: 1100px)');
  /*
   * LE MODE SIMPLE (ADR 0020) : des pions, des gestes, une frise courte, ni
   * outils ni onglets. Il cache, il n'efface rien.
   */
  const { mode, chosen, choose } = useUiMode();
  const simple = mode === 'simple';
  /** « Passe à… » : le passeur, en attendant qu'on touche le receveur. */
  const [passFrom, setPassFrom] = useState<string | null>(null);
  const [guided, setGuided] = useLocalStorage<boolean>(GUIDE_KEY, false);
  const guide = useGuideProgress();
  const guiding = simple && chosen && !guided;
  const [view, setView] = useState<View>('2d');
  const [camera, setCamera] = useState<CameraPreset>('tribune');
  const [tool, setTool] = useState<Tool>('select');
  // En mode simple, aucun outil : toucher choisit, glisser déplace.
  const activeTool: Tool = simple ? 'select' : tool;
  const [eco, setEco] = useLocalStorage('mister-uwh-tactic:eco', false);
  const [tab, setTab] = useState<PanelTab>('step');
  /*
   * AU TÉLÉPHONE, LE PANNEAU EST UNE FEUILLE À CRANS (ADR 0017) : fermée,
   * ses onglets restent visibles au-dessus de la barre basse.
   */
  const compact = useMediaQuery('(max-width: 47.99rem)');
  const [sheet, setSheet] = useState<SheetState>('peek');
  const [apneaOpen, setApneaOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  /** Le menu n'est monté qu'une fois ouvert : son morceau attend jusque-là. */
  const [menuMounted, setMenuMounted] = useState(false);
  // L'impression : la feuille se monte, s'imprime, puis se démonte.
  const [printing, print] = usePrinting();
  /*
   * LA BASCULE SE FAIT DANS UNE TRANSITION : tant que la scène n'est pas
   * prête, le tableau 2D reste à l'écran et l'attente se dit sur le tableau,
   * au lieu d'un squelette qui ferait sauter la page.
   */
  const [switching, startSwitch] = useTransition();
  useIdlePrefetch(loadPool3D);
  useIdlePrefetch(loadSecondary);

  /*
   * LE MODE PRÉSENTATION : plein écran, écran maintenu allumé, de grands
   * boutons. Pour montrer une phase sur une tablette au bord du bassin.
   */
  const fullscreen = useFullscreenState();
  const [presenting, setPresenting] = useState(false);
  /** Le feutre de la présentation, et combien de fois on l'a effacé (ADR 0031). */
  const [marking, setMarking] = useState(false);
  const [clears, setClears] = useState(0);
  useWakeLock(presenting);
  /*
   * ÉCHAP A QUITTÉ LE PLEIN ÉCRAN : la présentation s'arrête avec lui —
   * seulement s'il a été obtenu. Refusé (hors d'un geste : une séance lancée
   * depuis un autre écran), la présentation reste, dans la page ; elle
   * s'arrêtait sinon au bout de 300 ms.
   */
  const wasFullscreen = useRef(false);
  useEffect(() => {
    if (fullscreen.active) wasFullscreen.current = true;
  }, [fullscreen.active]);
  useEffect(() => {
    if (!presenting || !fullscreen.supported || fullscreen.active) return;
    if (!wasFullscreen.current) return;
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        wasFullscreen.current = false;
        setPresenting(false);
        useSeancePlay.getState().stop();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [presenting, fullscreen.active, fullscreen.supported]);
  const present = async () => {
    wasFullscreen.current = false;
    setPresenting(true);
    if (fullscreen.supported) await fullscreen.enter();
  };
  /*
   * UNE SÉANCE DEMANDE LA PRÉSENTATION en ouvrant le tableau
   * (`state.present`). La demande est effacée de l'historique aussitôt : un
   * retour en arrière ne la rejoue pas.
   */
  const location = useLocation();
  const navigate = useNavigate();
  const seanceId = useSeancePlay(s => s.seanceId);
  const presentRequested =
    (location.state as { present?: boolean } | null)?.present === true;
  const onPresentRequest = useEffectEvent(() => {
    void navigate(location.pathname, { replace: true, state: null });
    void present();
  });
  useEffect(() => {
    // Juste après l'effet, pas pendant : la présentation change l'état, et
    // un changement d'état dans le corps d'un effet relance le rendu en
    // cascade.
    if (presentRequested) queueMicrotask(onPresentRequest);
  }, [presentRequested]);
  /*
   * GLISSER POUR CHANGER D'ÉTAPE, en présentation : la tablette passe de
   * main en main au bord du bassin, et un doigt qui balaie va plus vite que
   * viser un bouton. Un balayage franc et horizontal seulement — un toucher
   * reste un toucher.
   */
  const [swipe, setSwipe] = useState<{ x: number; y: number } | null>(null);
  const onSwipeStart = (event: React.PointerEvent) => {
    // Sur la 3D, glisser fait tourner la caméra : ce n'est pas un balayage.
    const onScene =
      event.target instanceof Element && !!event.target.closest('canvas');
    if (event.pointerType === 'touch' && !onScene) {
      setSwipe({ x: event.clientX, y: event.clientY });
    }
  };
  const onSwipeEnd = (event: React.PointerEvent) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    setSwipe(null);
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const { step: at } = boardStore.getState();
    actions.goTo(dx < 0 ? at + 1 : at - 1);
  };

  const stopPresenting = async () => {
    setPresenting(false);
    setMarking(false);
    useSeancePlay.getState().stop();
    if (fullscreen.active) await fullscreen.exit();
  };

  const effectiveView: View = view === 'both' && !wide ? '2d' : view;
  const show2d = effectiveView !== '3d';
  const show3d = effectiveView !== '2d';

  /*
   * L'INSPECTEUR SUIT LA SÉLECTION : toucher un jeton, c'est vouloir agir
   * dessus. Le panneau passe à « Jeton » ; il ne revient pas en arrière
   * quand on désélectionne, pour ne pas arracher l'onglet sous le doigt. Au
   * téléphone, la feuille reste où elle est : la barre posée sur le terrain
   * suffit aux gestes courants.
   */
  const [followed, setFollowed] = useState(selected);
  if (selected !== followed) {
    setFollowed(selected);
    if (selected) setTab('token');
  }

  /**
   * L'inspecteur, depuis la barre posée sur le tableau : au téléphone, la
   * feuille s'ouvre à mi-hauteur, le terrain toujours visible au-dessus.
   */
  const showInspector = () => {
    setTab('token');
    if (compact && sheet === 'peek') setSheet('half');
  };

  /**
   * REPARTIR À ZÉRO, PUIS POUVOIR REVENIR (ADR 0008). Une confirmation
   * demandait « Repartir d'un tableau vierge ? » avant d'agir ; la
   * notification garde de quoi rendre le tableau pendant huit secondes. Un
   * dialogue rendait le geste lent, pas réversible.
   */
  const startOver = () => {
    const previous = boardStore.getState().tactic;
    actions.reset({ lite: simple });
    offerEffectif(boardStore.getState().tactic.id);
    const toastId = `tableau-vierge-${previous.id}-${previous.updatedAt}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('board.newDone')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            actions.load(previous);
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  /** Double-clic ou Entrée sur un jeton : l'inspecteur, le nom en main. */
  const edit = (id: string) => {
    if (boardStore.getState().selected !== id) actions.select(id);
    setTab('token');
    if (compact && sheet === 'peek') setSheet('half');
    requestAnimationFrame(() =>
      document.getElementById(INSPECTOR_NAME_ID)?.focus()
    );
  };

  /**
   * UN LIEN PARTAGÉ S'OUVRE DANS LE TABLEAU, puis quitte l'adresse : laissé
   * là, il rouvrirait le même schéma à chaque rechargement, par-dessus ce
   * qu'on a fait depuis.
   */
  useEffect(() => {
    const shared = sharedCodeFromHash(window.location.hash);
    if (!shared) return;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
    decodeShared(shared, { id: createUuid(), now: new Date().toISOString() })
      .then(opened => {
        actions.load(opened);
        offerEffectif(opened.id);
        toast.show(t('board.sharedOpened'), { tone: 'success' });
      })
      .catch(() => toast.show(t('board.sharedInvalid'), { tone: 'error' }));
  }, [actions, t, toast]);

  // La lecture avance au rythme de l'affichage, et s'arrête avec lui.
  // L'HORLOGE EST CELLE DES IMAGES, DÈS LA PREMIÈRE : le rappel reçoit l'heure
  // du début de l'image, qui peut précéder un `performance.now()` lu ici. Le
  // premier pas arrivait alors négatif, et « Lire » plantait depuis la
  // première étape.
  useEffect(() => {
    if (!playing) return;
    let frameId = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      if (last !== null) actions.tick((now - last) / 1000);
      last = now;
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [playing, actions]);

  const apnea = useMemo(() => apneaTable(tactic), [tactic]);
  const warnings = useMemo(
    () => (playing ? undefined : overLimit(apnea, step)),
    [apnea, step, playing]
  );
  // LES ALERTES : l'apnée, la vitesse, et ce que voient les arbitres
  // (`checks.ts`) — la frise marque les étapes, l'onglet les compte.
  const warnedSteps = useMemo(
    () => alertedSteps(tactic, apnea),
    [tactic, apnea]
  );
  const current = tactic.steps[step]!;
  const carrier = current.carrier
    ? tactic.roster.players.find(p => p.id === current.carrier)
    : undefined;
  const labels = useBoardLabels(
    warnings,
    carrier ? playerTitle(t, carrier) : undefined
  );
  // L'étape racontée, pour un lecteur d'écran (ADR 0030) : à l'arrêt
  // seulement — en lecture, la phrase changerait sous l'oreille.
  const describe = useDescribeStep();
  const description = playing ? undefined : describe(tactic, step);
  const decisionLabel = (decision: Decision) =>
    decision.kind === 'timeout'
      ? t('board.decisions.timeout')
      : t(`board.decisions.${decision.kind}`, {
          team: t(
            decision.team === 'noir' ? 'board.teamBlack' : 'board.teamWhite'
          ),
        });
  const alerts = playing ? 0 : stepAlerts(tactic, apnea, step).count;

  const save = async () => {
    const name =
      tactic.name.trim() ||
      t('board.defaultName', {
        date: fmt.dateTime(new Date(), {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });
    if (name !== tactic.name) actions.setName(name);
    try {
      await saveSchema({ ...boardStore.getState().tactic, name });
      toast.show(t('board.saved', { name }), { tone: 'success' });
    } catch {
      toast.show(t('board.saveFailed'), { tone: 'error' });
    }
  };

  /*
   * LES RACCOURCIS DU TABLEAU, hors d'une saisie :
   *
   * - Ctrl+Z, Ctrl+Y ou Ctrl+Maj+Z : annuler, rétablir ;
   * - Ctrl+S : enregistrer — sans quoi le navigateur proposait d'enregistrer
   *   la PAGE, ce que personne ne voulait ;
   * - virgule et point : étape précédente, suivante ;
   * - Espace : lire ou mettre en pause, sauf sur un vrai bouton, qu'Espace
   *   active déjà.
   *
   * Un évènement d'effet (`useEffectEvent`) lit toujours la dernière version
   * de l'état sans réabonner l'écouteur à chaque rendu.
   */
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (typing(event.target)) return;
    const key = event.key.toLowerCase();
    if (sheetOpen()) {
      // Ni le tableau caché, ni l'annulation du NAVIGATEUR : laissée faire,
      // elle revenait sur la dernière saisie de la page — le nom du schéma,
      // derrière la feuille. Une saisie DANS la feuille garde la sienne
      // (`typing`, plus haut).
      if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
        event.preventDefault();
      }
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        actions.undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        actions.redo();
      } else if (key === 's') {
        event.preventDefault();
        void save();
      }
      return;
    }
    if (event.altKey) return;
    const state = boardStore.getState();
    // En présentation, aucun jeton n'a la main : les flèches tournent les
    // pages, comme un diaporama — et une télécommande de présentation, qui
    // envoie justement ces touches, aussi.
    const previous =
      event.key === ',' ||
      (presenting && ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key));
    const next =
      event.key === '.' ||
      (presenting &&
        ['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key));
    if (previous) {
      event.preventDefault();
      actions.goTo(state.step - 1);
    } else if (next) {
      event.preventDefault();
      actions.goTo(state.step + 1);
    } else if (event.key === ' ' && !isNativeControl(event.target)) {
      if (state.tactic.steps.length < 2) return;
      event.preventDefault();
      if (state.playing) actions.pause();
      else actions.play();
    }
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /*
   * « PASSE À… », EN MODE SIMPLE : le passeur choisi, on touche le receveur.
   * La passe part du palet si le passeur le porte, sinon de lui. Toucher un
   * arbitre ou le palet ne fait rien : on attend un joueur.
   */
  const pickReceiver = (id: string) => {
    if (!passFrom) return false;
    const state = boardStore.getState();
    const now = state.tactic.steps[state.step]!;
    const receiver = state.tactic.roster.players.find(p => p.id === id);
    const passer = state.tactic.roster.players.find(p => p.id === passFrom);
    const to = now.poses[id];
    const at = now.poses[passFrom];
    if (!receiver || !passer || !to || !at || id === passFrom) return true;
    const from = now.carrier === passFrom ? now.puck : at;
    actions.addArrow({
      kind: 'pass',
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
    });
    toast.show(
      t('simple.passDone', {
        from: playerTitle(t, passer),
        to: playerTitle(t, receiver),
      }),
      { tone: 'success' }
    );
    trackEvent('passe', { issue: 'tracee' });
    setPassFrom(null);
    return true;
  };

  /*
   * UN BROUILLON INTACT REPART EN SIX CONTRE SIX en mode simple : 35 jetons
   * au téléphone, c'était le premier écran trop chargé. Intact = sans nom,
   * une étape, à l'engagement — un lien partagé, un schéma ouvert ne sont
   * jamais touchés. Relu à chaque NOUVEAU brouillon, pas seulement à
   * l'arrivée : la déconnexion remet le tableau à neuf sous les yeux
   * (`leaveDraft.ts`), avec l'effectif complet.
   */
  useEffect(() => {
    if (!simple) return;
    const draft = boardStore.getState().tactic;
    const { counts } = draft;
    const extras =
      counts.referees > 0 ||
      counts.deckReferee ||
      counts.substitutes.blanc > 0 ||
      counts.substitutes.noir > 0;
    const intact =
      draft.name === '' &&
      draft.steps.length === 1 &&
      JSON.stringify(draft.steps[0]) ===
        JSON.stringify(kickoffStep(draft.pitch));
    if (extras && intact) actions.reset({ lite: true });
  }, [simple, actions, tactic.id]);

  /*
   * EN DIRECT, en 2D comme en 3D, jamais en présentation : on y regarde une
   * phase, on ne l'enregistre pas. Entrer en présentation l'arrête.
   */
  const recording = useBoard(s => s.recording);
  const effectifOffered = useEffectifOffer() === tactic.id;
  const canRecord = !presenting;
  useEffect(() => {
    if (recording && !canRecord) actions.setRecording(false);
  }, [recording, canRecord, actions]);

  const hint = switching
    ? t('board.loading3d')
    : recording && canRecord
      ? t('board.recordHint')
      : activeTool !== 'select' && show2d
        ? t('board.toolHint', { kind: t(`arrows.${activeTool}`) })
        : show3d && camera === 'suivi' && !selected
          ? t('board.cameraPovHint')
          : null;

  return (
    <>
      <div
        className={
          simple ? 'uwh-workspace uwh-workspace--simple' : 'uwh-workspace'
        }
        // LE DOIGT DU GUIDE : le bouton du geste en cours porte un anneau.
        data-guide={guiding ? guide.target?.control : undefined}
      >
        <h2 className="sr-only">{t('board.title')}</h2>
        <WorkspaceBar
          saveState={saveState}
          onSave={() => void save()}
          onMenu={() => {
            setMenuMounted(true);
            setMenu(true);
          }}
        />
        {/* LE PREMIER LANCEMENT EN MODE SIMPLE le dit, sans rien bloquer : on
          le garde, ou on passe en complet. Une fois choisi, plus rien. */}
        {simple && !chosen ? (
          <div
            className="uwh-modecard"
            role="region"
            aria-label={t('simple.title')}
          >
            <p className="m-0">{t('simple.welcome')}</p>
            <div className="uwh-row">
              <Button
                size="sm"
                variant="primary"
                onClick={() => choose('simple', 'accueil')}
              >
                {t('simple.keep')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => choose('advanced', 'accueil')}
              >
                {t('simple.toAdvanced')}
              </Button>
            </div>
          </div>
        ) : null}
        {/* Une fois le mode choisi, après quelques ouvertures : un avis. */}
        {/* Puis la première phase guidée ; l'avis ne vient qu'après elle. */}
        {guiding ? (
          <SimpleGuide progress={guide} onDone={() => setGuided(true)} />
        ) : null}
        {simple && chosen && guided ? <SimpleFeedback /> : null}
        {/* Un schéma vient d'arriver : ses prénoms d'un geste, ou rien. */}
        {effectifOffered ? (
          <Suspense fallback={null}>
            <EffectifOffer />
          </Suspense>
        ) : null}

        <div className="uwh-workspace__main">
          <div className="uwh-workspace__board">
            {simple ? null : (
              <BoardToolbar
                view={effectiveView}
                onView={value => startSwitch(() => setView(value))}
                allowBoth={wide}
                show2d={show2d}
                show3d={show3d}
                tool={tool}
                onTool={setTool}
                camera={camera}
                onCamera={setCamera}
              />
            )}

            <div
              className={presenting ? 'uwh-present' : 'uwh-stage'}
              role={presenting ? 'dialog' : undefined}
              aria-modal={presenting ? true : undefined}
              aria-label={presenting ? t('board.present') : undefined}
              onPointerDown={presenting ? onSwipeStart : undefined}
              onPointerUp={presenting ? onSwipeEnd : undefined}
            >
              {presenting ? (
                <div className="uwh-present__bar">
                  <strong className="truncate">
                    {tactic.name || t('board.untitled')}
                  </strong>
                  {seanceId ? (
                    <Suspense fallback={null}>
                      <SeanceNav />
                    </Suspense>
                  ) : null}
                  <StepTimeline warned={warnedSteps} big />
                  <Button
                    variant="ghost"
                    iconOnly
                    className="uwh-marker-toggle"
                    aria-label={t('board.marker')}
                    aria-pressed={marking}
                    onClick={() => setMarking(on => !on)}
                  >
                    <Highlighter size={22} aria-hidden="true" />
                  </Button>
                  {marking ? (
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={t('board.markerClear')}
                      onClick={() => setClears(n => n + 1)}
                    >
                      <Eraser size={22} aria-hidden="true" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={t('board.stopPresenting')}
                    onClick={() => void stopPresenting()}
                  >
                    {fullscreen.active ? (
                      <Minimize2 size={22} aria-hidden="true" />
                    ) : (
                      <X size={22} aria-hidden="true" />
                    )}
                  </Button>
                </div>
              ) : null}
              <div
                className={
                  effectiveView === 'both'
                    ? 'uwh-stage__views uwh-split'
                    : 'uwh-stage__views'
                }
              >
                {show2d ? (
                  <Board2D
                    labels={labels}
                    onEdit={edit}
                    // En présentation, le tableau se montre : un doigt qui
                    // balaie change d'étape, il ne déplace pas un joueur.
                    interactive={!presenting}
                    orientation="fit"
                    tool={activeTool === 'select' ? null : activeTool}
                    warnings={warnings}
                    variant={simple ? 'pawns' : 'swimmers'}
                    onPick={simple ? pickReceiver : undefined}
                    whichLabel={t('board.whichToken')}
                    highlight={guiding ? guide.target?.token : undefined}
                    dockCorner={compact && !presenting}
                    description={description}
                  />
                ) : null}
                {show3d ? (
                  <Suspense
                    fallback={
                      <SkeletonGroup label={t('board.loading3d')} lines={4} />
                    }
                  >
                    <Pool3D
                      camera={camera}
                      label={t('board.pool3d')}
                      unavailable={t('board.unavailable3d')}
                      formatDistance={labels.formatDistance}
                      eco={eco}
                    />
                  </Suspense>
                ) : null}
                {/* LE FEUTRE (ADR 0031), par-dessus la 2D comme la 3D : il
                    s'efface à l'étape suivante et sur « Effacer ». */}
                {presenting && marking ? (
                  <PresentMarker clearKey={`${step}-${clears}`} />
                ) : null}
              </div>
              {hint && !presenting ? (
                <p className="uwh-stage__hint" role="status">
                  {hint}
                </p>
              ) : null}
              {/* La barre posée sur le terrain double l'inspecteur : feuille
                ouverte, elle n'a plus rien à dire, et cacherait le terrain
                réduit au-dessus. */}
              {!presenting &&
              !simple &&
              !playing &&
              activeTool === 'select' &&
              show2d &&
              !(compact && sheet !== 'peek') ? (
                <SelectionBar onDetails={showInspector} />
              ) : null}
              {presenting ? null : (
                <div className="uwh-stage__dock">
                  <LayersPopover eco={eco} onEco={setEco} />
                </div>
              )}
              {presenting && current.note ? (
                <p className="uwh-present__note">
                  <TermText text={current.note} />
                </p>
              ) : null}
              {/* L'ARRÊT DE JEU se lit sur le tableau, en présentation aussi :
                c'est ce que l'arbitre vient de décider. */}
              {current.decision ? (
                <p className="uwh-stage__decision" role="status">
                  <Megaphone size={16} aria-hidden="true" />
                  {t('board.decisionStage', {
                    decision: decisionLabel(current.decision),
                  })}
                </p>
              ) : null}
              {/* PENDANT LA LECTURE, la consigne de l'étape se lit sur le
                tableau : on regarde la phase, pas l'onglet « Étape ». */}
              {playing && !presenting && current.note ? (
                <p className="uwh-stage__caption">
                  <strong>{step + 1}</strong> <TermText text={current.note} />
                </p>
              ) : null}
            </div>

            {/* EN MODE SIMPLE, la barre sous le tableau dit tout, en
              toutes lettres : pas d'onglets à chercher. */}
            {simple && !presenting && !playing && show2d ? (
              <SimpleBar
                passFrom={passFrom}
                onPassStart={id => setPassFrom(id)}
                onPassCancel={() => {
                  setPassFrom(null);
                  trackEvent('passe', { issue: 'annulee' });
                }}
                onAdvanced={() => choose('advanced', 'barre')}
              />
            ) : null}
            <StepTimeline
              warned={warnedSteps}
              simple={simple}
              canRecord={canRecord}
              onApnea={simple ? undefined : () => setApneaOpen(true)}
              alerts={{
                count: alerts,
                label: fmt.plural(alerts, m.panel.alerts, { count: alerts }),
              }}
            />
          </div>

          {simple ? null : (
            <ContextPanel
              id={PANEL_ID}
              tab={tab}
              onTab={setTab}
              compact={compact}
              sheet={sheet}
              onSheet={setSheet}
            >
              {tab === 'step' ? (
                <StepPanel formatDistance={labels.formatDistance} />
              ) : null}
              <Suspense
                fallback={
                  <SkeletonGroup label={t('panel.loading')} lines={4} />
                }
              >
                {tab === 'token' ? <Inspector /> : null}
                {tab === 'teams' ? <TeamsPanel /> : null}
                {tab === 'rules' ? <RulesPanel /> : null}
                {tab === 'pool' ? <PoolPanel /> : null}
              </Suspense>
              {aside ? <div className="uwh-panel__aside">{aside}</div> : null}
            </ContextPanel>
          )}
        </div>

        {/* LA FRISE D'APNÉE, depuis la frise des étapes (ADR 0017). Une
          feuille : au téléphone, elle monte du bas ; sur grand écran, elle
          s'ouvre au centre, assez large pour une colonne par étape. */}
        <Sheet
          open={apneaOpen}
          title={t('apnea.title')}
          onClose={() => setApneaOpen(false)}
          className="uwh-apnea-sheet"
        >
          <Suspense
            fallback={<SkeletonGroup label={t('panel.loading')} lines={4} />}
          >
            <ApneaPanel table={apnea} />
          </Suspense>
        </Sheet>

        {menuMounted ? (
          <Suspense fallback={null}>
            <ActionsMenu
              open={menu}
              onClose={() => setMenu(false)}
              has3d={show3d}
              onPrint={print}
              onPresent={() => void present()}
              onNew={startOver}
              simple={simple}
              onMode={() => choose(simple ? 'advanced' : 'simple', 'menu')}
              onView3d={() => startSwitch(() => setView(show3d ? '2d' : '3d'))}
            />
          </Suspense>
        ) : null}

        {printing ? <PrintSheet labels={labels} /> : null}
      </div>
      {/* SANS PANNEAU, LE PIED DE PAGE DE LA FAMILLE SUIT L'ESPACE DE TRAVAIL,
        hors de lui : dedans, il prenait la hauteur du tableau. */}
      {simple && aside ? (
        <div className="uwh-workspace__aside">{aside}</div>
      ) : null}
    </>
  );
}
