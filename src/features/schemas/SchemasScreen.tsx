import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CloudUpload,
  Copy,
  Download,
  Ellipsis,
  FilePlus2,
  History,
  Link2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  useIdlePrefetch,
  usePrefetch,
} from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import {
  dateSlug,
  downloadJson,
  readJsonFile,
} from '@mister-guiiug/dev-pwa-config/download';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { shareOrCopy } from '@mister-guiiug/dev-pwa-config/share';
import { useI18n } from '../../i18n/index.ts';
import { usePrinting } from '../../app/usePrinting.ts';
import { Board2D } from '../board/Board2D.tsx';
import {
  buildExample,
  EXAMPLE_GROUPS,
  type ExampleId,
  type ExampleStory,
} from '../board/examples.ts';
import { useBoardLabels } from '../board/labels.ts';
import type { Tactic } from '../board/model.ts';
import { useReplaceDraft } from '../board/replaceDraft.tsx';
import { useUiMode } from '../board/mode.ts';
import { shareUrl } from '../board/share.ts';
import { boardStore, useBoard } from '../board/store.ts';
import { tagKey, tagLabel } from '../board/tags.ts';
import { Popover } from '../../ui/Popover.tsx';
import { arrivalFrom } from '../carnet/link.ts';
import { offerEffectif } from '../effectif/offer.ts';
import { arrange, copyNameFor, tagsIn, type Sort } from './arrange.ts';
import { parseTacticFiles, toLibraryFile, toTacticFile } from './file.ts';
import type { Picked } from './selection.ts';
import { useSchemas } from './store.ts';
import { TagFilter } from './TagFilter.tsx';
import { noteUsage } from '../../app/usage.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/*
 * LE CARNET DE JEU DANS SON MORCEAU (ADR 0023, `carnet/parts.ts`) : la barre
 * de sélection, la feuille et son codeur, l'avis d'arrivée. L'accueil n'en
 * porte que la case de chaque vignette. Le même thunk pour `lazy()` et pour
 * le préchargement au repos : déjà là au premier « Sélectionner ».
 */
const loadCarnet = () => import('../carnet/parts.ts');
const PickBar = lazy(() =>
  loadCarnet().then(module => ({ default: module.PickBar }))
);
const CarnetShare = lazy(() =>
  loadCarnet().then(module => ({ default: module.CarnetShare }))
);
const ArrivalNotice = lazy(() =>
  loadCarnet().then(module => ({ default: module.ArrivalNotice }))
);
const CarnetPrint = lazy(() =>
  loadCarnet().then(module => ({ default: module.CarnetPrint }))
);

/** LE CORPS DE LA FEUILLE DES ÉTIQUETTES (ADR 0029), à la demande aussi. */
const loadTagEditor = () => import('./TagEditor.tsx');
const TagEditor = lazy(() =>
  loadTagEditor().then(module => ({ default: module.TagEditor }))
);

/** LE CORPS DE LA FEUILLE DES VERSIONS (ADR 0034), à la demande aussi. */
const loadVersions = () => import('./SchemaVersions.tsx');
const SchemaVersions = lazy(() =>
  loadVersions().then(module => ({ default: module.SchemaVersions }))
);
/** Les deux feuilles du menu « ⋯ », préchargées ensemble à son approche. */
const loadCardSheets = () => Promise.all([loadTagEditor(), loadVersions()]);

/**
 * LA BIBLIOTHÈQUE DES SCHÉMAS, en vignettes : on reconnaît une phase à son
 * dessin bien avant son nom. Chaque carte montre la première étape, le nom,
 * le nombre d'étapes et la date ; ouvrir, partager, exporter, supprimer.
 *
 * Un schéma ouvert REMPLACE le brouillon du tableau : si celui-ci porte des
 * modifications que la bibliothèque n'a pas, une notification permet de le
 * rendre. Avant la refonte, l'ouverture remplaçait sans rien dire.
 *
 * Vide, elle ne se contente plus de le constater : elle propose de créer un
 * schéma, ou d'en ouvrir un d'exemple qui montre ce qu'un schéma sait dire.
 */
export function SchemasScreen() {
  const { t, m, fmt, locale } = useI18n();
  const navigate = useNavigate();
  const schemas = useSchemas(s => s.schemas);
  const outside = useSchemas(s => s.outside);
  const ready = useSchemas(s => s.ready);
  const error = useSchemas(s => s.error);
  const load = useSchemas(s => s.load);
  const save = useSchemas(s => s.save);
  const remove = useSchemas(s => s.remove);
  const draft = useBoard(s => s.tactic);
  const labels = useBoardLabels();
  const toast = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  /*
   * LE FILTRE PAR ÉTIQUETTE (ADR 0029). Une étiquette qui n'est plus portée
   * par aucun schéma ne filtre plus : « Toutes » reprend la main.
   */
  const [tag, setTag] = useState<string | null>(null);
  const present = useMemo(() => tagsIn(schemas, locale), [schemas, locale]);
  const activeTag =
    tag !== null && present.some(p => tagKey(p) === tagKey(tag)) ? tag : null;
  const shown = useMemo(
    () => arrange(schemas, query, sort, locale, activeTag),
    [schemas, query, sort, locale, activeTag]
  );
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const tagging = schemas.find(schema => schema.id === taggingId);
  // Préchargées à l'approche d'un menu « ⋯ », seule porte vers les feuilles.
  const tagEditorSoon = usePrefetch(loadCardSheets).linkProps;
  const [versioningId, setVersioningId] = useState<string | null>(null);
  const versioning = schemas.find(schema => schema.id === versioningId);

  /*
   * LE CARNET DE JEU (ADR 0023) : cocher des schémas, ou tout ce que l'écran
   * montre, puis les envoyer d'un lien ; et, à l'arrivée d'un carnet, le
   * montrer. Les schémas reçus sont marqués, et l'ordre par date les met en
   * tête, dans l'ordre du carnet.
   */
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Picked>(() => new Set());
  const [sharing, setSharing] = useState<Tactic[] | null>(null);
  // LE CARNET IMPRIMÉ (ADR 0037) : la sélection, montée le temps du papier.
  const [printing, print] = usePrinting();
  const [toPrint, setToPrint] = useState<Tactic[]>([]);
  useIdlePrefetch(loadCarnet);
  const location = useLocation();
  const arrival = arrivalFrom(location.state);
  const arrived = new Set(arrival?.ids);

  useEffect(() => {
    void load();
  }, [load]);

  /** Remplacer le brouillon, et pouvoir le rendre (ADR 0008). */
  const replaceDraft = useReplaceDraft();
  const { mode: uiMode } = useUiMode();

  // Un schéma reçu d'un carnet porte les prénoms de qui l'envoie : le
  // sien, l'effectif, est proposé, pas imposé (ADR 0028).
  const open = (tactic: Tactic) =>
    replaceDraft(() => {
      boardStore.getState().load(tactic);
      if (arrived.has(tactic.id)) offerEffectif(tactic.id);
      void navigate('/');
    });

  // En mode simple, un schéma neuf part en six contre six (ADR 0020).
  const create = () =>
    replaceDraft(() => {
      boardStore.getState().reset({ lite: uiMode === 'simple' });
      offerEffectif(boardStore.getState().tactic.id);
      void navigate('/');
    });

  /** Le nom et les consignes d'un exemple, dans la langue de l'écran. */
  const exampleStory = (id: ExampleId): ExampleStory => {
    const texts = m.schemas.examples[id] as Record<string, string>;
    const notes =
      id === 'neutral'
        ? [
            t('schemas.exampleNote1'),
            t('schemas.exampleNote2'),
            t('schemas.exampleNote3'),
          ]
        : Object.keys(texts)
            .filter(key => key.startsWith('note'))
            .sort()
            .map(key => texts[key]!);
    return { name: texts.name!, notes };
  };

  const openExample = (id: ExampleId) =>
    replaceDraft(() => {
      const example = buildExample(id, exampleStory(id), { id: createUuid() });
      boardStore.getState().load(example);
      offerEffectif(example.id);
      toast.show(t('schemas.exampleOpened'), { tone: 'success' });
      void navigate('/');
    });

  /*
   * LES EXEMPLES, PAR LEUR NOM ET CE QU'ILS MONTRENT, EN DEUX GROUPES : les
   * phases de jeu (celle d'ouverture, puis celles tirées des documents de
   * formation, coups francs compris), et les exercices d'entraînement. Un
   * titre par groupe, et une liste qu'il nomme : un lecteur d'écran annonce
   * « Exercices, liste, 4 éléments » avant le premier bouton.
   */
  const examplePicker = (variant: 'outline' | 'ghost') => (
    <Popover
      label={t('schemas.examplePick')}
      align="start"
      className="uwh-examples"
      trigger={props => (
        <Button variant={variant} {...props}>
          <Sparkles size={18} aria-hidden="true" />
          {t('schemas.example')}
        </Button>
      )}
    >
      {close =>
        EXAMPLE_GROUPS.map(group => (
          <Fragment key={group.id}>
            <h2 className="uwh-menu__group" id={`uwh-examples-${group.id}`}>
              {m.schemas.exampleGroups[group.id]}
            </h2>
            <ul
              className="uwh-menu"
              aria-labelledby={`uwh-examples-${group.id}`}
            >
              {group.ids.map(id => (
                <li key={id}>
                  <button
                    type="button"
                    // Le nom au-dessus de l'aide : la colonne de
                    // `uwh-menu__text`, portée par le bouton lui-même.
                    className="uwh-menu__item uwh-menu__item--stacked"
                    // LE NOM ACCESSIBLE EST CE QUI SE LIT : le nom, puis
                    // l'aide. Un `aria-label` réduit au nom contredisait le
                    // texte visible (WCAG 2.5.3, axe
                    // `label-content-name-mismatch`) — comme le menu « ⋯ ».
                    onClick={() => {
                      close();
                      openExample(id);
                    }}
                  >
                    <span className="uwh-menu__name">
                      {m.schemas.examples[id].name}
                    </span>
                    <span className="uwh-menu__hint">
                      {m.schemas.examples[id].hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Fragment>
        ))
      }
    </Popover>
  );

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImported(null);
    try {
      const { tactics, rejected } = parseTacticFiles(await readJsonFile(file));
      for (const tactic of tactics) await save(tactic);
      setImportError(null);
      const done =
        tactics.length === 1
          ? t('schemas.imported', {
              name: tactics[0]!.name || t('board.untitled'),
            })
          : fmt.plural(tactics.length, m.schemas.importedMany, {
              count: tactics.length,
            });
      setImported(
        rejected > 0
          ? `${done} ${fmt.plural(rejected, m.schemas.importSkipped, {
              count: rejected,
            })}`
          : done
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  /**
   * SUPPRIMER SANS DEMANDER, ANNULER APRÈS COUP (ADR 0008). Le schéma part
   * tout de suite ; la notification garde de quoi le remettre pendant huit
   * secondes. Un dialogue rendrait le geste lent, pas réversible.
   */
  const removeWithUndo = (schema: Tactic) => {
    void remove(schema.id);
    const toastId = `schema-supprime-${schema.id}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('schemas.removed', { name: schema.name || t('board.untitled') })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            void save(schema);
          }}
        >
          {t('schemas.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  /**
   * DUPLIQUER : le point de départ d'une variante — la même sortie de but,
   * côté gauche. La copie a son identifiant, sa date, et « (copie) » au nom.
   */
  const duplicate = async (schema: Tactic) => {
    const now = new Date().toISOString();
    const name = copyNameFor(
      schema.name || t('board.untitled'),
      schemas.map(s => s.name),
      n =>
        n === undefined
          ? t('schemas.copySuffix')
          : t('schemas.copySuffixN', { n })
    );
    try {
      await save({
        ...schema,
        id: createUuid(),
        name,
        createdAt: now,
        updatedAt: now,
      });
      toast.show(t('schemas.duplicated', { name }), { tone: 'success' });
    } catch {
      // Le magasin a restauré la liste et posé l'erreur, affichée plus bas.
    }
  };

  /**
   * POSER DES ÉTIQUETTES, C'EST MODIFIER LE SCHÉMA : il est daté du geste,
   * sans quoi la synchronisation (ADR 0015), qui garde le plus récent,
   * ignorerait le changement. Ouvert sur le tableau, le brouillon les reçoit
   * aussi — enregistré, il le reste ; modifié, il le reste aussi —, et ne
   * les effacera pas au prochain « Enregistrer ».
   */
  const retag = async (schema: Tactic, tags: string[]) => {
    const now = new Date().toISOString();
    const next: Tactic = { ...schema, tags, updatedAt: now };
    if (tags.length === 0) delete next.tags;
    else noteUsage('tag');
    const draft = boardStore.getState().tactic;
    if (draft.id === schema.id) {
      boardStore
        .getState()
        .setTags(tags, draft.updatedAt === schema.updatedAt ? now : undefined);
    }
    try {
      await save(next);
    } catch {
      // Le magasin a restauré la liste et posé l'erreur, affichée plus bas.
    }
  };

  const shareLink = async (schema: Tactic) => {
    const result = await shareOrCopy({
      title: schema.name || t('board.untitled'),
      text: t('schemas.shareText'),
      url: shareUrl(schema, appBase()),
    });
    if (result === 'copied') {
      toast.show(t('schemas.copied'), { tone: 'success' });
    } else if (result === 'failed') {
      toast.show(t('export.linkFailed'), { tone: 'error' });
    }
  };

  /*
   * UNE ACTION PRINCIPALE, LE RESTE SOUS « ⋯ » (ADR 0017, gabarit « Card
   * Grid » d'Astryx) : quatre boutons de même poids disaient tous « je suis
   * important ». L'exemple reste en vue tant que la bibliothèque est vide.
   */
  const actions = (
    <div className="uwh-row">
      <Button variant="primary" onClick={create}>
        <FilePlus2 size={18} aria-hidden="true" />
        {t('schemas.create')}
      </Button>
      {examplePicker(schemas.length === 0 ? 'outline' : 'ghost')}
      <Popover
        label={t('schemas.moreActions')}
        align="start"
        trigger={props => (
          <Button variant="ghost" {...props}>
            <Ellipsis size={18} aria-hidden="true" />
            {t('schemas.moreActions')}
          </Button>
        )}
      >
        {close => (
          <ul className="uwh-menu">
            <PopoverItem
              icon={<Upload size={18} />}
              label={t('schemas.import')}
              onClick={() => {
                close();
                fileInput.current?.click();
              }}
            />
            {schemas.length > 0 ? (
              <PopoverItem
                icon={<Download size={18} />}
                label={t('schemas.exportAll')}
                onClick={() => {
                  close();
                  downloadJson(
                    toLibraryFile(schemas),
                    `schemas-${dateSlug()}.json`
                  );
                }}
              />
            ) : null}
          </ul>
        )}
      </Popover>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label={t('schemas.import')}
        onChange={event => void onFile(event)}
      />
    </div>
  );

  return (
    <>
      {actions}

      {arrival ? (
        <Suspense fallback={null}>
          <ArrivalNotice
            arrival={arrival}
            onDismiss={() =>
              void navigate(location.pathname, { replace: true, state: null })
            }
          />
        </Suspense>
      ) : null}
      {imported ? (
        <p role="status" className="m-0 mt-3 text-supporting">
          {imported}
        </p>
      ) : null}
      {importError ? (
        <ErrorBanner
          message={t('schemas.importFailed', { error: importError })}
          className="mt-3"
        />
      ) : null}
      {error ? <ErrorBanner message={error} className="mt-3" /> : null}

      {!ready ? (
        <SkeletonGroup
          label={t('schemas.loading')}
          lines={3}
          className="mt-6"
        />
      ) : schemas.length === 0 ? (
        outside.length > 0 ? (
          <EmptyState
            title={t('schemas.emptyAccount')}
            description={t('schemas.emptyAccountHint')}
            className="mt-8"
          />
        ) : (
          <EmptyState
            title={t('schemas.empty')}
            description={t('schemas.emptyHint')}
            className="mt-8"
          />
        )
      ) : (
        <>
          {schemas.length > 1 ? (
            <div className="uwh-library__filters">
              <TextField
                type="search"
                label={t('schemas.search')}
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="min-w-48 flex-1"
              />
              <SelectField
                label={t('schemas.sort')}
                value={sort}
                onChange={event => setSort(event.target.value as Sort)}
              >
                <option value="recent">{t('schemas.sortRecent')}</option>
                <option value="name">{t('schemas.sortName')}</option>
                <option value="steps">{t('schemas.sortSteps')}</option>
              </SelectField>
            </div>
          ) : null}
          {present.length > 0 && schemas.length > 1 ? (
            <TagFilter tags={present} value={activeTag} onChange={setTag} />
          ) : null}
          <div className="uwh-row uwh-row--between mt-4">
            <p className="uwh-muted m-0 text-supporting" aria-live="polite">
              {shown.length === schemas.length
                ? fmt.plural(schemas.length, m.schemas.count, {
                    count: schemas.length,
                  })
                : t('schemas.countFiltered', {
                    shown: shown.length,
                    total: fmt.plural(schemas.length, m.schemas.count, {
                      count: schemas.length,
                    }),
                  })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPicking(value => !value)}
            >
              {picking ? t('carnet.done') : t('carnet.select')}
            </Button>
          </div>
          {shown.length === 0 ? (
            <p className="m-0 mt-4">{t('schemas.noMatch', { query })}</p>
          ) : null}
          <ul className="uwh-library" data-picking={picking ? '' : undefined}>
            {shown.map(schema => {
              const name = schema.name || t('board.untitled');
              const isCurrent = schema.id === draft.id;
              const isPicked = picking && picked.has(schema.id);
              const preview = (
                <Board2D
                  labels={labels}
                  tactic={schema}
                  orientation="landscape"
                />
              );
              return (
                <li
                  key={schema.id}
                  className="uwh-library__card"
                  data-picked={isPicked ? '' : undefined}
                >
                  {/* En sélection, toute la vignette coche la case. */}
                  {picking ? (
                    <label className="uwh-library__preview">
                      <span className="uwh-check uwh-library__check">
                        <input
                          type="checkbox"
                          checked={isPicked}
                          aria-label={t('carnet.pick', { name })}
                          onChange={() =>
                            setPicked(value => {
                              const next = new Set(value);
                              if (!next.delete(schema.id)) next.add(schema.id);
                              return next;
                            })
                          }
                        />
                      </span>
                      {preview}
                    </label>
                  ) : (
                    // UN RACCOURCI POUR LE DOIGT, TU AU LECTEUR D'ÉCRAN :
                    // « Ouvrir », plus bas, dit la même chose. Nommé, il
                    // contredisait le texte du terrain qu'il contient (axe,
                    // label-content-name-mismatch), relevé le 21/11/2026 par
                    // le premier audit d'une bibliothèque non vide.
                    <button
                      type="button"
                      className="uwh-library__preview"
                      aria-hidden="true"
                      tabIndex={-1}
                      onClick={() => open(schema)}
                    >
                      {preview}
                    </button>
                  )}
                  <div className="uwh-library__body">
                    <h2 className="uwh-library__name">{name}</h2>
                    <p className="uwh-muted m-0 text-supporting">
                      {fmt.plural(schema.steps.length, m.board.stepCount, {
                        count: schema.steps.length,
                      })}
                      {' · '}
                      {fmt.relative(schema.updatedAt)}
                    </p>
                    {schema.tags && schema.tags.length > 0 ? (
                      <ul
                        className="uwh-library__tags"
                        aria-label={t('tags.label')}
                      >
                        {schema.tags.map(tag => (
                          <li key={tag}>
                            <Badge size="sm">
                              {tagLabel(tag, m.tags.suggested)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {isCurrent ? (
                      <p className="uwh-library__current m-0 text-supporting">
                        {t('schemas.current')}
                      </p>
                    ) : null}
                    {arrived.has(schema.id) ? (
                      <p className="uwh-library__current m-0 text-supporting">
                        {t('carnet.arrivedTag')}
                      </p>
                    ) : null}
                  </div>
                  {/* Masquées en sélection (`index.css`) : un toucher y
                      coche, il n'ouvre pas. */}
                  <div className="uwh-library__actions">
                    <Button variant="primary" onClick={() => open(schema)}>
                      {t('schemas.open')}
                    </Button>
                    <Popover
                      label={t('schemas.cardActions', { name })}
                      align="end"
                      trigger={props => (
                        <Button
                          variant="ghost"
                          iconOnly
                          aria-label={t('schemas.cardActions', { name })}
                          {...tagEditorSoon}
                          {...props}
                        >
                          <Ellipsis size={18} aria-hidden="true" />
                        </Button>
                      )}
                    >
                      {close => (
                        <ul className="uwh-menu">
                          <PopoverItem
                            icon={<Link2 size={18} />}
                            label={t('schemas.menuShare')}
                            onClick={() => {
                              close();
                              void shareLink(schema);
                            }}
                          />
                          <PopoverItem
                            icon={<Download size={18} />}
                            label={t('schemas.menuExport')}
                            onClick={() => {
                              close();
                              downloadJson(
                                toTacticFile(schema),
                                `schema-${dateSlug(schema.updatedAt)}.json`
                              );
                            }}
                          />
                          <PopoverItem
                            icon={<Tag size={18} />}
                            label={t('tags.label')}
                            onClick={() => {
                              close();
                              setTaggingId(schema.id);
                            }}
                          />
                          <PopoverItem
                            icon={<History size={18} />}
                            label={t('versions.menu')}
                            onClick={() => {
                              close();
                              setVersioningId(schema.id);
                            }}
                          />
                          <PopoverItem
                            icon={<Copy size={18} />}
                            label={t('schemas.menuDuplicate')}
                            onClick={() => {
                              close();
                              void duplicate(schema);
                            }}
                          />
                          <PopoverItem
                            icon={<Trash2 size={18} />}
                            label={t('schemas.menuRemove')}
                            danger
                            onClick={() => {
                              close();
                              removeWithUndo(schema);
                            }}
                          />
                        </ul>
                      )}
                    </Popover>
                  </div>
                </li>
              );
            })}
          </ul>
          {picking ? (
            <Suspense fallback={null}>
              <PickBar
                schemas={schemas}
                shownIds={shown.map(schema => schema.id)}
                sort={sort}
                picked={picked}
                onPick={setPicked}
                onShare={setSharing}
                onPrint={chosen => {
                  setToPrint(chosen);
                  print();
                }}
              />
            </Suspense>
          ) : null}
        </>
      )}
      {printing ? (
        <Suspense fallback={null}>
          <CarnetPrint schemas={toPrint} />
        </Suspense>
      ) : null}
      {tagging ? (
        <Sheet
          open
          title={t('tags.title', {
            name: tagging.name || t('board.untitled'),
          })}
          onClose={() => setTaggingId(null)}
          footer={
            <Button variant="primary" onClick={() => setTaggingId(null)}>
              {t('tags.done')}
            </Button>
          }
        >
          <Suspense fallback={null}>
            <TagEditor
              tags={tagging.tags ?? []}
              library={present}
              onChange={tags => void retag(tagging, tags)}
            />
          </Suspense>
        </Sheet>
      ) : null}
      {versioning ? (
        <Sheet
          open
          title={t('versions.title', {
            name: versioning.name || t('board.untitled'),
          })}
          onClose={() => setVersioningId(null)}
        >
          <Suspense fallback={null}>
            <SchemaVersions schema={versioning} />
          </Suspense>
        </Sheet>
      ) : null}
      {sharing ? (
        <Sheet open title={t('carnet.title')} onClose={() => setSharing(null)}>
          <Suspense fallback={null}>
            <CarnetShare schemas={sharing} />
          </Suspense>
        </Sheet>
      ) : null}

      {ready && outside.length > 0 ? (
        <OutsideSchemas schemas={outside} onOpen={open} />
      ) : null}
    </>
  );
}

/** Une entrée d'un menu ancré : une icône, un mot. */
function PopoverItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="uwh-menu__item uwh-menu__item--compact"
        data-danger={danger ? '' : undefined}
        onClick={onClick}
      >
        <span className="uwh-menu__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="uwh-menu__text">{label}</span>
      </button>
    </li>
  );
}

/**
 * HORS DU COMPTE, SUR CET APPAREIL (ADR 0015) : ce qu'on a enregistré avant
 * de se connecter, ou ce qu'un autre a laissé sur une tablette de club. La
 * connexion ne les range pas d'elle-même — ils peuvent être à quelqu'un
 * d'autre. On les voit, on peut les ouvrir, et les ajouter à son compte
 * d'un geste : un par un, ou tous.
 */
function OutsideSchemas({
  schemas,
  onOpen,
}: {
  schemas: Tactic[];
  onOpen: (tactic: Tactic) => void;
}) {
  const { t, m, fmt } = useI18n();
  const labels = useBoardLabels();
  const adopt = useSchemas(s => s.adopt);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const add = async (ids: string[]) => {
    setBusy(true);
    try {
      const count = await adopt(ids);
      if (count > 0) {
        toast.show(fmt.plural(count, m.schemas.adopted, { count }), {
          tone: 'success',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="uwh-outside" aria-labelledby="uwh-outside-title">
      <h2 id="uwh-outside-title" className="uwh-outside__title">
        {t('schemas.outsideTitle')}
      </h2>
      <p className="uwh-muted m-0 text-supporting">
        {t('schemas.outsideHint')}
      </p>
      {schemas.length > 1 ? (
        <div className="uwh-row">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void add(schemas.map(s => s.id))}
          >
            <CloudUpload size={18} aria-hidden="true" />
            {fmt.plural(schemas.length, m.schemas.adoptAll, {
              count: schemas.length,
            })}
          </Button>
        </div>
      ) : null}
      <ul className="uwh-library">
        {schemas.map(schema => {
          const name = schema.name || t('board.untitled');
          return (
            <li key={schema.id} className="uwh-library__card">
              {/* Tu au lecteur d'écran, comme dans la bibliothèque. */}
              <button
                type="button"
                className="uwh-library__preview"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => onOpen(schema)}
              >
                <Board2D
                  labels={labels}
                  tactic={schema}
                  orientation="landscape"
                />
              </button>
              <div className="uwh-library__body">
                <h3 className="uwh-library__name">{name}</h3>
                <p className="uwh-muted m-0 text-supporting">
                  {fmt.plural(schema.steps.length, m.board.stepCount, {
                    count: schema.steps.length,
                  })}
                  {' · '}
                  {fmt.relative(schema.updatedAt)}
                </p>
              </div>
              <div className="uwh-library__actions">
                {/* Le nom COMMENCE par le texte visible : un lecteur d'écran
                    entend lequel, une commande vocale trouve le bouton par
                    ce qu'elle voit (axe, label-content-name-mismatch). */}
                <Button
                  variant="primary"
                  disabled={busy}
                  aria-label={`${t('schemas.adopt')} : « ${name} »`}
                  onClick={() => void add([schema.id])}
                >
                  <CloudUpload size={18} aria-hidden="true" />
                  {t('schemas.adopt')}
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`${t('schemas.open')} « ${name} »`}
                  onClick={() => onOpen(schema)}
                >
                  {t('schemas.open')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
