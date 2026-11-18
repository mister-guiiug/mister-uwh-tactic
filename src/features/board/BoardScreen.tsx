import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { Minimize2, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { useWakeLock } from '@mister-guiiug/dev-pwa-config/react/use-wake-lock';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { useI18n } from '../../i18n/index.ts';
import { useSchemas } from '../schemas/store.ts';
import { Board2D } from './Board2D.tsx';
import { PrintSheet } from './PrintSheet.tsx';
import { apneaTable, overLimit } from './apnea.ts';
import { useBoardLabels } from './labels.ts';
import { useSaveState } from './saveState.ts';
import { decodeShared, sharedCodeFromHash } from './share.ts';
import { boardStore, useBoard } from './store.ts';
import type { CameraPreset } from './scene3d.ts';
import {
  BoardToolbar,
  type Tool,
  type View,
} from './workspace/BoardToolbar.tsx';
import { ContextPanel } from './workspace/ContextPanel.tsx';
import type { PanelTab } from './workspace/panelTabs.ts';
import { SelectionBar } from './workspace/SelectionBar.tsx';
import { StepTimeline } from './workspace/StepTimeline.tsx';
import { WorkspaceBar } from './workspace/WorkspaceBar.tsx';
import { Inspector, INSPECTOR_NAME_ID } from './panels/Inspector.tsx';

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

/** Le panneau, que la barre de sélection fait défiler jusqu'à l'écran. */
const PANEL_ID = 'uwh-panel';
const Pool3D = lazy(loadPool3D);

/**
 * LES ONGLETS SECONDAIRES ET LE MENU, à la demande (`panels/secondary.ts`) :
 * un seul morceau, le même thunk pour `lazy()` et pour le préchargement au
 * repos. L'inspecteur, onglet d'ouverture, reste dans l'accueil.
 */
const loadSecondary = () => import('./panels/secondary.ts');
const StepPanel = lazy(() =>
  loadSecondary().then(m => ({ default: m.StepPanel }))
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

/** Une feuille ouverte (menu, QR) garde ses touches. */
const inSheet = (target: EventTarget | null) =>
  target instanceof HTMLElement && !!target.closest('[data-dwc="sheet"]');

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
 * L'accroche et le pied de page n'y sont pas : ils appartiennent à
 * l'accueil (`features/home/HomeScreen.tsx`), qui le rend.
 */
export function BoardScreen() {
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
  const [view, setView] = useState<View>('2d');
  const [camera, setCamera] = useState<CameraPreset>('tribune');
  const [tool, setTool] = useState<Tool>('select');
  const [eco, setEco] = useLocalStorage('mister-uwh-tactic:eco', false);
  const [tab, setTab] = useState<PanelTab>('selection');
  const [menu, setMenu] = useState(false);
  /** Le menu n'est monté qu'une fois ouvert : son morceau attend jusque-là. */
  const [menuMounted, setMenuMounted] = useState(false);
  const [printing, setPrinting] = useState(false);
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
  useWakeLock(presenting);
  useEffect(() => {
    if (!presenting || !fullscreen.supported || fullscreen.active) return;
    // Échap a quitté le plein écran : la présentation s'arrête avec lui.
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) setPresenting(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [presenting, fullscreen.active, fullscreen.supported]);
  const present = async () => {
    setPresenting(true);
    if (fullscreen.supported) await fullscreen.enter();
  };
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
    if (fullscreen.active) await fullscreen.exit();
  };

  const effectiveView: View = view === 'both' && !wide ? '2d' : view;
  const show2d = effectiveView !== '3d';
  const show3d = effectiveView !== '2d';

  /*
   * L'INSPECTEUR SUIT LA SÉLECTION : toucher un jeton, c'est vouloir agir
   * dessus. Le panneau passe à « Sélection » ; il ne revient pas en arrière
   * quand on désélectionne, pour ne pas arracher l'onglet sous le doigt.
   */
  const [followed, setFollowed] = useState(selected);
  if (selected !== followed) {
    setFollowed(selected);
    if (selected) setTab('selection');
  }

  /**
   * L'inspecteur, depuis la barre posée sur le tableau : sur un téléphone, il
   * est sous la frise, on y descend.
   */
  const showInspector = () => {
    setTab('selection');
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    requestAnimationFrame(() =>
      document.getElementById(PANEL_ID)?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
    );
  };

  /**
   * REPARTIR À ZÉRO, PUIS POUVOIR REVENIR (ADR 0008). Une confirmation
   * demandait « Repartir d'un tableau vierge ? » avant d'agir ; la
   * notification garde de quoi rendre le tableau pendant huit secondes. Un
   * dialogue rendait le geste lent, pas réversible.
   */
  const startOver = () => {
    const previous = boardStore.getState().tactic;
    actions.reset();
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
    setTab('selection');
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
        toast.show(t('board.sharedOpened'), { tone: 'success' });
      })
      .catch(() => toast.show(t('board.sharedInvalid'), { tone: 'error' }));
  }, [actions, t, toast]);

  // La lecture avance au rythme de l'affichage, et s'arrête avec lui.
  useEffect(() => {
    if (!playing) return;
    let frameId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      actions.tick((now - last) / 1000);
      last = now;
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [playing, actions]);

  // L'impression : la feuille se monte, s'imprime, puis se démonte.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done, { once: true });
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  const apnea = useMemo(() => apneaTable(tactic), [tactic]);
  const warnings = useMemo(
    () => (playing ? undefined : overLimit(apnea, step)),
    [apnea, step, playing]
  );
  const warnedSteps = useMemo(() => {
    const set = new Set<number>();
    tactic.steps.forEach((_, i) => {
      if (overLimit(apnea, i).size > 0) set.add(i);
    });
    return set;
  }, [apnea, tactic.steps]);
  const labels = useBoardLabels(warnings);
  const current = tactic.steps[step]!;
  const alerts = warnings?.size ?? 0;

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
    if (event.altKey || inSheet(event.target)) return;
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

  const hint = switching
    ? t('board.loading3d')
    : tool !== 'select' && show2d
      ? t('board.toolHint', { kind: t(`arrows.${tool}`) })
      : show3d && camera === 'suivi' && !selected
        ? t('board.cameraPovHint')
        : null;

  return (
    <div className="uwh-workspace">
      <h2 className="sr-only">{t('board.title')}</h2>
      <WorkspaceBar
        saveState={saveState}
        onSave={() => void save()}
        onMenu={() => {
          setMenuMounted(true);
          setMenu(true);
        }}
      />

      <div className="uwh-workspace__main">
        <div className="uwh-workspace__board">
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
                <StepTimeline warned={warnedSteps} big />
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
                  tool={tool === 'select' ? null : tool}
                  warnings={warnings}
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
            </div>
            {hint && !presenting ? (
              <p className="uwh-stage__hint" role="status">
                {hint}
              </p>
            ) : null}
            {!presenting && !playing && tool === 'select' && show2d ? (
              <SelectionBar onDetails={showInspector} />
            ) : null}
            {presenting && current.note ? (
              <p className="uwh-present__note">{current.note}</p>
            ) : null}
            {/* PENDANT LA LECTURE, la consigne de l'étape se lit sur le
                tableau : on regarde la phase, pas l'onglet « Étape ». */}
            {playing && !presenting && current.note ? (
              <p className="uwh-stage__caption">
                <strong>{step + 1}</strong> {current.note}
              </p>
            ) : null}
          </div>

          <StepTimeline warned={warnedSteps} />
        </div>

        <ContextPanel
          id={PANEL_ID}
          tab={tab}
          onTab={setTab}
          badges={{
            apnea: {
              count: alerts,
              label: fmt.plural(alerts, m.panel.alerts, { count: alerts }),
            },
          }}
        >
          {tab === 'selection' ? <Inspector /> : null}
          <Suspense
            fallback={<SkeletonGroup label={t('panel.loading')} lines={4} />}
          >
            {tab === 'step' ? (
              <StepPanel formatDistance={labels.formatDistance} />
            ) : null}
            {tab === 'teams' ? <TeamsPanel /> : null}
            {tab === 'rules' ? <RulesPanel /> : null}
            {tab === 'apnea' ? <ApneaPanel table={apnea} /> : null}
            {tab === 'pool' ? <PoolPanel eco={eco} onEco={setEco} /> : null}
          </Suspense>
        </ContextPanel>
      </div>

      {menuMounted ? (
        <Suspense fallback={null}>
          <ActionsMenu
            open={menu}
            onClose={() => setMenu(false)}
            has3d={show3d}
            onPrint={() => setPrinting(true)}
            onPresent={() => void present()}
            onNew={startOver}
          />
        </Suspense>
      ) : null}

      {printing ? <PrintSheet labels={labels} /> : null}
    </div>
  );
}
