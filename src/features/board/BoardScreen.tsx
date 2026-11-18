import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  FilePlus2,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  Waves,
  X,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { ShareButton } from '@mister-guiiug/dev-pwa-config/react/share-button';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { useFullscreen } from '@mister-guiiug/dev-pwa-config/react/use-fullscreen';
import { useWakeLock } from '@mister-guiiug/dev-pwa-config/react/use-wake-lock';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { useI18n } from '../../i18n/index.ts';
import { useSchemas } from '../schemas/store.ts';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import { TokenSheet } from './TokenSheet.tsx';
import { FormationCard } from './FormationCard.tsx';
import { SituationCard } from './SituationCard.tsx';
import { ApneaCard } from './ApneaCard.tsx';
import { ExportCard } from './ExportCard.tsx';
import { PrintSheet } from './PrintSheet.tsx';
import { apneaTable, overLimit } from './apnea.ts';
import { frameAt } from './frame.ts';
import {
  ARROW_KINDS,
  MAX_PLAYERS,
  MAX_SUBSTITUTES,
  PITCH_LIMITS,
  PUCK_ID,
  REFEREE_PAIRS,
  STEP_DURATION,
  type ArrowKind,
  type RefereePair,
} from './model.ts';
import { decodeShared, sharedCodeFromHash, shareUrl } from './share.ts';
import { boardStore, SPEEDS, useBoard, type Speed } from './store.ts';
import type { CameraPreset } from './scene3d.ts';

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
const Pool3D = lazy(loadPool3D);

type View = '2d' | '3d' | 'both';
type Tool = 'select' | ArrowKind;

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/** Une saisie en cours ne se fait pas voler Ctrl+Z par le tableau. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * LE TABLEAU : la barre du schéma, la vue 2D, 3D ou les deux, le jeton
 * sélectionné, les étapes, l'apnée, les compositions et les situations, et
 * l'export. L'accroche et le pied de page n'y sont pas : ils appartiennent à
 * l'accueil (`features/home/HomeScreen.tsx`), qui le rend.
 */
export function BoardScreen() {
  const { t, m, fmt } = useI18n();
  const toast = useToast();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const playhead = useBoard(s => s.playhead);
  const playing = useBoard(s => s.playing);
  const speed = useBoard(s => s.speed);
  const selected = useBoard(s => s.selected);
  const extra = useBoard(s => s.extra);
  const canUndo = useBoard(s => s.past.length > 0);
  const canRedo = useBoard(s => s.future.length > 0);
  const actions = useMemo(() => boardStore.getState(), []);
  const saveSchema = useSchemas(s => s.save);

  const wide = useMediaQuery('(min-width: 1100px)');
  const [view, setView] = useState<View>('2d');
  const [camera, setCamera] = useState<CameraPreset>('tribune');
  const [tool, setTool] = useState<Tool>('select');
  const [eco, setEco] = useLocalStorage('mister-uwh-tactic:eco', false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [printing, setPrinting] = useState(false);
  /*
   * LA BASCULE SE FAIT DANS UNE TRANSITION : tant que la scène n'est pas
   * prête, le tableau 2D reste à l'écran et l'attente se dit sous le
   * sélecteur, au lieu d'un squelette qui ferait sauter la page.
   */
  const [switching, startSwitch] = useTransition();
  useIdlePrefetch(loadPool3D);

  /*
   * LE MODE PRÉSENTATION : plein écran, écran maintenu allumé, de grands
   * boutons. Pour montrer une phase sur une tablette au bord du bassin.
   */
  const fullscreen = useFullscreen();
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
  const stopPresenting = async () => {
    setPresenting(false);
    if (fullscreen.active) await fullscreen.exit();
  };

  const effectiveView: View = view === 'both' && !wide ? '2d' : view;
  const show2d = effectiveView !== '3d';
  const show3d = effectiveView !== '2d';

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

  // Annuler, rétablir : Ctrl+Z, Ctrl+Y ou Ctrl+Maj+Z — hors d'une saisie.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        actions.undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        actions.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

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

  const formatDistance = useCallback(
    (metres: number) =>
      `${fmt.number(metres, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`,
    [fmt]
  );

  const apnea = useMemo(() => apneaTable(tactic), [tactic]);
  const warnings = useMemo(
    () => (playing ? undefined : overLimit(apnea, step)),
    [apnea, step, playing]
  );

  const labels: Board2DLabels = useMemo(
    () => ({
      pitch: t('board.pitch'),
      help: t('board.help'),
      puck: t('board.puck'),
      player: p =>
        [
          t(p.team === 'blanc' ? 'board.whitePlayer' : 'board.blackPlayer', {
            number: p.number,
          }),
          p.substitute ? t('board.substitute') : '',
          p.name,
          p.surfaceness >= 0.5 ? t('board.surface') : t('board.underwater'),
          p.leftHanded ? t('board.leftHanded') : '',
          warnings?.has(p.id) ? t('apnea.warning') : '',
        ]
          .filter(Boolean)
          .join(', '),
      referee: r =>
        [
          r.deck
            ? t('board.deckReferee')
            : t('board.referee', { number: r.number }),
          r.name,
        ]
          .filter(Boolean)
          .join(', '),
      formatDistance,
    }),
    [t, formatDistance, warnings]
  );

  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);
  const selectedPlayer = frame.players.find(p => p.id === selected);
  const selectedReferee = frame.referees.find(r => r.id === selected);
  const selectedToken = selectedPlayer ?? selectedReferee;
  const lastStep = tactic.steps.length - 1;
  const current = tactic.steps[step]!;

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

  const pitchField = (key: 'length' | 'width' | 'depth', label: string) => (
    <TextField
      label={label}
      type="number"
      inputMode="decimal"
      min={PITCH_LIMITS[key].min}
      max={PITCH_LIMITS[key].max}
      step={key === 'depth' ? 0.05 : 0.5}
      value={tactic.pitch[key]}
      onChange={event => {
        const value = Number(event.target.value);
        if (Number.isFinite(value) && event.target.value !== '') {
          actions.setPitch({ [key]: value });
        }
      }}
    />
  );

  const countOptions = (max: number) =>
    Array.from({ length: max + 1 }, (_, n) => (
      <option key={n} value={n}>
        {n}
      </option>
    ));

  const transport = (big: boolean) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size={big ? 'lg' : 'md'}
        iconOnly
        aria-label={t('board.previous')}
        disabled={step === 0 && !playing}
        onClick={() => actions.goTo(step - 1)}
      >
        <ChevronLeft size={big ? 28 : 20} aria-hidden="true" />
      </Button>
      <span
        className="min-w-24 text-center text-sm font-medium"
        aria-live="polite"
      >
        {t('board.stepOf', { step: step + 1, total: tactic.steps.length })}
      </span>
      <Button
        variant="ghost"
        size={big ? 'lg' : 'md'}
        iconOnly
        aria-label={t('board.next')}
        disabled={step >= lastStep && !playing}
        onClick={() => actions.goTo(step + 1)}
      >
        <ChevronRight size={big ? 28 : 20} aria-hidden="true" />
      </Button>
      <Button
        variant={playing ? 'secondary' : 'primary'}
        size={big ? 'lg' : 'md'}
        disabled={tactic.steps.length < 2}
        onClick={() => (playing ? actions.pause() : actions.play())}
      >
        {playing ? (
          <Pause size={18} aria-hidden="true" />
        ) : (
          <Play size={18} aria-hidden="true" />
        )}
        {playing ? t('board.pause') : t('board.play')}
      </Button>
      <SegmentedControl
        ariaLabel={t('board.speed')}
        size="sm"
        value={String(speed)}
        onChange={value => actions.setSpeed(Number(value) as Speed)}
        options={SPEEDS.map(s => ({
          value: String(s),
          label: `×${fmt.number(s)}`,
        }))}
      />
    </div>
  );

  const groupCount = selected ? 1 + extra.length : 0;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <TextField
          label={t('board.schemaName')}
          placeholder={t('board.untitled')}
          value={tactic.name}
          maxLength={60}
          onChange={event => actions.setName(event.target.value)}
          className="min-w-48 flex-1"
        />
        <Button variant="primary" onClick={() => void save()}>
          <Save size={18} aria-hidden="true" />
          {t('board.save')}
        </Button>
        <ShareButton
          title={tactic.name || t('board.untitled')}
          text={t('schemas.shareText')}
          url={shareUrl(tactic, appBase())}
          label={t('schemas.share')}
          copiedLabel={t('schemas.copied')}
        />
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.undo')}
          title={t('board.undoKeys')}
          disabled={!canUndo}
          onClick={actions.undo}
        >
          <Undo2 size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.redo')}
          title={t('board.redoKeys')}
          disabled={!canRedo}
          onClick={actions.redo}
        >
          <Redo2 size={18} aria-hidden="true" />
        </Button>
        <Button variant="ghost" onClick={() => setConfirmNew(true)}>
          <FilePlus2 size={18} aria-hidden="true" />
          {t('board.new')}
        </Button>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-semibold">{t('board.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel={t('board.view')}
            value={effectiveView}
            onChange={value => startSwitch(() => setView(value as View))}
            options={[
              { value: '2d', label: t('board.view2d') },
              { value: '3d', label: t('board.view3d') },
              ...(wide ? [{ value: 'both', label: t('board.viewBoth') }] : []),
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => void present()}>
            <Maximize2 size={16} aria-hidden="true" />
            {t('board.present')}
          </Button>
        </div>
      </div>
      {switching ? (
        <p role="status" className="m-0 mb-2 text-sm">
          {t('board.loading3d')}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-3">
        {show2d ? (
          <SegmentedControl
            ariaLabel={t('board.tool')}
            size="sm"
            value={tool}
            onChange={value => setTool(value as Tool)}
            options={[
              { value: 'select', label: t('board.toolSelect') },
              ...ARROW_KINDS.map(kind => ({
                value: kind,
                label: t(`arrows.${kind}`),
              })),
            ]}
          />
        ) : null}
        {show3d ? (
          <>
            <SegmentedControl
              ariaLabel={t('board.camera')}
              size="sm"
              value={camera}
              onChange={value => setCamera(value as CameraPreset)}
              options={[
                { value: 'tribune', label: t('board.cameraStand') },
                { value: 'dessus', label: t('board.cameraTop') },
                { value: 'immersion', label: t('board.cameraUnderwater') },
                { value: 'suivi', label: t('board.cameraPov') },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={eco}
                onChange={event => setEco(event.target.checked)}
              />
              {t('board.eco')}
            </label>
          </>
        ) : null}
      </div>
      {tool !== 'select' && show2d ? (
        <p className="m-0 mb-2 text-sm" role="status">
          {t('board.toolHint', { kind: t(`arrows.${tool}`) })}
        </p>
      ) : null}
      {show3d && camera === 'suivi' && !selectedToken ? (
        <p
          className="m-0 mb-2 text-sm"
          style={{ color: 'var(--dwc-text-soft)' }}
        >
          {t('board.cameraPovHint')}
        </p>
      ) : null}

      <div
        className={presenting ? 'uwh-present' : undefined}
        role={presenting ? 'dialog' : undefined}
        aria-modal={presenting ? true : undefined}
        aria-label={presenting ? t('board.present') : undefined}
      >
        {presenting ? (
          <div className="uwh-present__bar">
            <strong className="truncate">
              {tactic.name || t('board.untitled')}
            </strong>
            {transport(true)}
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
        <div className={effectiveView === 'both' ? 'uwh-split' : undefined}>
          {show2d ? (
            <Board2D
              labels={labels}
              onEdit={setEditing}
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
                formatDistance={formatDistance}
                eco={eco}
              />
            </Suspense>
          ) : null}
        </div>
        {presenting && current.note ? (
          <p className="uwh-present__note">{current.note}</p>
        ) : null}
      </div>

      {/* LA BARRE DE LA SÉLECTION : ce qu'on fait au doigt sur le terrain, en
          boutons — pour qui ne peut pas viser une poignée de huit pixels, ou
          ne veut pas. */}
      <div
        className="mt-2 flex min-h-11 flex-wrap items-center gap-2"
        aria-live="polite"
      >
        {groupCount > 1 && !playing ? (
          <>
            <span className="text-sm font-medium">
              {t('board.groupSelected', { count: groupCount })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('board.rotateGroupLeft')}
              onClick={() => actions.rotateSelection(-15)}
            >
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('board.rotateGroupRight')}
              onClick={() => actions.rotateSelection(15)}
            >
              <RotateCw size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.select(null)}
            >
              {t('board.deselect')}
            </Button>
          </>
        ) : selectedToken && !playing ? (
          <>
            <span className="text-sm font-medium">
              {selectedPlayer
                ? labels.player(selectedPlayer)
                : labels.referee(selectedReferee!)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('board.rotateLeft')}
              onClick={() =>
                actions.rotate(selectedToken.id, selectedToken.angle - 15)
              }
            >
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('board.rotateRight')}
              onClick={() =>
                actions.rotate(selectedToken.id, selectedToken.angle + 15)
              }
            >
              <RotateCw size={18} aria-hidden="true" />
            </Button>
            {selectedPlayer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  actions.setSurface(
                    selectedPlayer.id,
                    selectedPlayer.surfaceness < 0.5
                  )
                }
              >
                <Waves size={16} aria-hidden="true" />
                {selectedPlayer.surfaceness >= 0.5
                  ? t('board.dive')
                  : t('board.surfaceUp')}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(selectedToken.id)}
            >
              <Pencil size={16} aria-hidden="true" />
              {t('board.edit')}
            </Button>
          </>
        ) : selected === PUCK_ID ? (
          <span className="text-sm font-medium">{t('board.puckSelected')}</span>
        ) : (
          <>
            <span className="text-sm" style={{ color: 'var(--dwc-text-soft)' }}>
              {t('board.hint')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.selectTeam('blanc')}
            >
              {t('board.selectWhite')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.selectTeam('noir')}
            >
              {t('board.selectBlack')}
            </Button>
          </>
        )}
      </div>

      {/* LES ÉTAPES : une phase de jeu est une suite de positions. */}
      <Card className="mt-3 flex flex-col gap-3">
        {transport(false)}
        <div className="flex flex-wrap items-end gap-2">
          <Button variant="outline" size="sm" onClick={actions.addStep}>
            <CopyPlus size={16} aria-hidden="true" />
            {t('board.addStep')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={tactic.steps.length < 2}
            onClick={actions.removeStep}
          >
            <Trash2 size={16} aria-hidden="true" />
            {t('board.removeStep')}
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.resetToKickoff}>
            {t('board.kickoff')}
          </Button>
          <TextField
            label={t('board.duration', { step: step + 1 })}
            type="number"
            inputMode="numeric"
            min={STEP_DURATION.min}
            max={STEP_DURATION.max}
            value={current.duration}
            onChange={event => {
              if (event.target.value !== '') {
                actions.setDuration(Number(event.target.value));
              }
            }}
            className="w-44"
          />
        </div>
        <TextAreaField
          label={t('board.note', { step: step + 1 })}
          placeholder={t('board.notePlaceholder')}
          rows={2}
          maxLength={280}
          value={current.note}
          onChange={event => actions.setNote(event.target.value)}
        />
        {current.arrows.length > 0 ? (
          <div>
            <p className="m-0 mb-1 text-sm font-medium">
              {t('arrows.listTitle', { step: step + 1 })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {current.arrows.map((arrow, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span>
                    {t('arrows.describe', {
                      kind: t(`arrows.${arrow.kind}`),
                      length: formatDistance(
                        Math.hypot(
                          arrow.to.x - arrow.from.x,
                          arrow.to.y - arrow.from.y
                        )
                      ),
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={t('arrows.remove', { index: i + 1 })}
                    onClick={() => actions.removeArrow(i)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <ApneaCard />
      <FormationCard />
      <SituationCard />
      <ExportCard has3d={show3d} onPrint={() => setPrinting(true)} />

      <details className="uwh-details mt-3">
        <summary>{t('board.setup')}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SelectField
            label={t('board.whiteCount')}
            value={tactic.counts.blanc}
            onChange={event =>
              actions.setCount('blanc', Number(event.target.value))
            }
          >
            {countOptions(MAX_PLAYERS)}
          </SelectField>
          <SelectField
            label={t('board.blackCount')}
            value={tactic.counts.noir}
            onChange={event =>
              actions.setCount('noir', Number(event.target.value))
            }
          >
            {countOptions(MAX_PLAYERS)}
          </SelectField>
          <SelectField
            label={t('board.whiteSubs')}
            value={tactic.counts.substitutes.blanc}
            onChange={event =>
              actions.setSubstitutes('blanc', Number(event.target.value))
            }
          >
            {countOptions(MAX_SUBSTITUTES)}
          </SelectField>
          <SelectField
            label={t('board.blackSubs')}
            value={tactic.counts.substitutes.noir}
            onChange={event =>
              actions.setSubstitutes('noir', Number(event.target.value))
            }
          >
            {countOptions(MAX_SUBSTITUTES)}
          </SelectField>
          <SelectField
            label={t('board.refereeCount')}
            value={tactic.counts.referees}
            onChange={event =>
              actions.setCount('referees', Number(event.target.value))
            }
          >
            {[0, 2, 3].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={t('board.refereeLine')}
            value={tactic.display.refereeLine ?? ''}
            disabled={tactic.counts.referees < 2}
            onChange={event =>
              actions.setDisplay({
                refereeLine:
                  event.target.value === ''
                    ? null
                    : (event.target.value as RefereePair),
              })
            }
          >
            <option value="">{t('board.refereeLineNone')}</option>
            {REFEREE_PAIRS.filter(pair =>
              pair.split('-').every(n => Number(n) <= tactic.counts.referees)
            ).map(pair => (
              <option key={pair} value={pair}>
                {t('board.refereeLinePair', { a: pair[0]!, b: pair[2]! })}
              </option>
            ))}
          </SelectField>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tactic.counts.deckReferee}
              onChange={event => actions.setDeckReferee(event.target.checked)}
            />
            {t('board.deckRefereeShown')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tactic.display.fieldOfView}
              onChange={event =>
                actions.setDisplay({ fieldOfView: event.target.checked })
              }
            />
            {t('board.fieldOfView')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tactic.display.labels}
              onChange={event =>
                actions.setDisplay({ labels: event.target.checked })
              }
            />
            {t('board.labels')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tactic.display.ghosts}
              onChange={event =>
                actions.setDisplay({ ghosts: event.target.checked })
              }
            />
            {t('board.ghosts')}
          </label>
        </div>
        <p className="m-0 mt-4 mb-2 text-sm font-medium">{t('board.pool')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {pitchField('length', t('board.length'))}
          {pitchField('width', t('board.width'))}
          {pitchField('depth', t('board.depthField'))}
        </div>
        <p
          className="m-0 mt-2 text-sm"
          style={{ color: 'var(--dwc-text-soft)' }}
        >
          {t('board.poolHint')}
        </p>
      </details>

      <p className="mt-4 text-sm" style={{ color: 'var(--dwc-text-soft)' }}>
        {fmt.plural(tactic.steps.length, m.board.stepCount, {
          count: tactic.steps.length,
        })}
      </p>

      <TokenSheet id={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={confirmNew}
        destructive
        title={t('board.newConfirm')}
        message={t('board.newBody')}
        confirmLabel={t('board.newAction')}
        onConfirm={() => {
          actions.reset();
          setConfirmNew(false);
        }}
        onCancel={() => setConfirmNew(false)}
      />

      {printing ? <PrintSheet labels={labels} /> : null}
    </>
  );
}
