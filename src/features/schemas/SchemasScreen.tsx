import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  FilePlus2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { ShareButton } from '@mister-guiiug/dev-pwa-config/react/share-button';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import {
  dateSlug,
  downloadJson,
  readJsonFile,
} from '@mister-guiiug/dev-pwa-config/download';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { useI18n } from '../../i18n/index.ts';
import { Board2D } from '../board/Board2D.tsx';
import { exampleTactic } from '../board/examples.ts';
import { useBoardLabels } from '../board/labels.ts';
import type { Tactic } from '../board/model.ts';
import { useSaveState, worthKeeping } from '../board/saveState.ts';
import { shareUrl } from '../board/share.ts';
import { boardStore, useBoard } from '../board/store.ts';
import { arrange, type Sort } from './arrange.ts';
import { parseTacticFiles, toLibraryFile, toTacticFile } from './file.ts';
import { useSchemas } from './store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

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
  const ready = useSchemas(s => s.ready);
  const error = useSchemas(s => s.error);
  const load = useSchemas(s => s.load);
  const save = useSchemas(s => s.save);
  const remove = useSchemas(s => s.remove);
  const draft = useBoard(s => s.tactic);
  const saveState = useSaveState();
  const labels = useBoardLabels();
  const toast = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const shown = useMemo(
    () => arrange(schemas, query, sort, locale),
    [schemas, query, sort, locale]
  );

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * REMPLACER LE BROUILLON, ET POUVOIR LE RENDRE (ADR 0008). S'il porte un
   * travail que la bibliothèque n'a pas, la notification garde de quoi le
   * remettre pendant huit secondes — au lieu d'un dialogue qui demandait
   * avant d'agir.
   */
  const replaceDraft = (action: () => void) => {
    const previous = draft;
    const keep = worthKeeping(saveState, previous);
    action();
    if (!keep) return;
    const toastId = `brouillon-remplace-${previous.id}-${previous.updatedAt}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('schemas.replaced')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            boardStore.getState().load(previous);
          }}
        >
          {t('schemas.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  const open = (tactic: Tactic) =>
    replaceDraft(() => {
      boardStore.getState().load(tactic);
      void navigate('/');
    });

  const create = () =>
    replaceDraft(() => {
      boardStore.getState().reset();
      void navigate('/');
    });

  const openExample = () =>
    replaceDraft(() => {
      boardStore.getState().load(
        exampleTactic(
          {
            name: t('schemas.exampleName'),
            notes: [
              t('schemas.exampleNote1'),
              t('schemas.exampleNote2'),
              t('schemas.exampleNote3'),
            ],
          },
          { id: createUuid() }
        )
      );
      toast.show(t('schemas.exampleOpened'), { tone: 'success' });
      void navigate('/');
    });

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
    const name = t('schemas.copyName', {
      name: schema.name || t('board.untitled'),
    }).slice(0, 60);
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

  const actions = (
    <div className="uwh-row">
      <Button variant="primary" onClick={create}>
        <FilePlus2 size={18} aria-hidden="true" />
        {t('schemas.create')}
      </Button>
      <Button variant="outline" onClick={openExample}>
        <Sparkles size={18} aria-hidden="true" />
        {t('schemas.example')}
      </Button>
      <Button variant="ghost" onClick={() => fileInput.current?.click()}>
        <Upload size={18} aria-hidden="true" />
        {t('schemas.import')}
      </Button>
      {schemas.length > 0 ? (
        <Button
          variant="ghost"
          onClick={() =>
            downloadJson(toLibraryFile(schemas), `schemas-${dateSlug()}.json`)
          }
        >
          <Download size={18} aria-hidden="true" />
          {t('schemas.exportAll')}
        </Button>
      ) : null}
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

      {imported ? (
        <p role="status" className="m-0 mt-3 text-sm">
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
        <EmptyState
          title={t('schemas.empty')}
          description={t('schemas.emptyHint')}
          className="mt-8"
        />
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
          <p className="uwh-muted m-0 mt-4 text-sm" aria-live="polite">
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
          {shown.length === 0 ? (
            <p className="m-0 mt-4">{t('schemas.noMatch', { query })}</p>
          ) : null}
          <ul className="uwh-library">
            {shown.map(schema => {
              const name = schema.name || t('board.untitled');
              const isCurrent = schema.id === draft.id;
              return (
                <li key={schema.id} className="uwh-library__card">
                  <button
                    type="button"
                    className="uwh-library__preview"
                    aria-label={`${t('schemas.open')} « ${name} »`}
                    tabIndex={-1}
                    onClick={() => open(schema)}
                  >
                    <Board2D
                      labels={labels}
                      tactic={schema}
                      orientation="landscape"
                    />
                  </button>
                  <div className="uwh-library__body">
                    <h2 className="uwh-library__name">{name}</h2>
                    <p className="uwh-muted m-0 text-sm">
                      {fmt.plural(schema.steps.length, m.board.stepCount, {
                        count: schema.steps.length,
                      })}
                      {' · '}
                      {fmt.relative(schema.updatedAt)}
                    </p>
                    {isCurrent ? (
                      <p className="uwh-library__current m-0 text-sm">
                        {t('schemas.current')}
                      </p>
                    ) : null}
                  </div>
                  <div className="uwh-library__actions">
                    <Button variant="primary" onClick={() => open(schema)}>
                      {t('schemas.open')}
                    </Button>
                    <ShareButton
                      className="uwh-share"
                      title={name}
                      text={t('schemas.shareText')}
                      url={shareUrl(schema, appBase())}
                      label={t('schemas.share')}
                      copiedLabel={t('schemas.copied')}
                    />
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={`${t('schemas.export')} « ${name} »`}
                      onClick={() =>
                        downloadJson(
                          toTacticFile(schema),
                          `schema-${dateSlug(schema.updatedAt)}.json`
                        )
                      }
                    >
                      <Download size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={t('schemas.duplicate', { name })}
                      onClick={() => void duplicate(schema)}
                    >
                      <Copy size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      iconOnly
                      aria-label={t('schemas.remove', { name })}
                      onClick={() => removeWithUndo(schema)}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
