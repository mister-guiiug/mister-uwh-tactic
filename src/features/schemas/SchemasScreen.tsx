import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FilePlus2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
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
import { parseTacticFile, toTacticFile } from './file.ts';
import { useSchemas } from './store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/**
 * LA BIBLIOTHÈQUE DES SCHÉMAS, en vignettes : on reconnaît une phase à son
 * dessin bien avant son nom. Chaque carte montre la première étape, le nom,
 * le nombre d'étapes et la date ; ouvrir, partager, exporter, supprimer.
 *
 * Un schéma ouvert REMPLACE le brouillon du tableau : si celui-ci porte des
 * modifications que la bibliothèque n'a pas, on le demande d'abord. Avant la
 * refonte, l'ouverture remplaçait sans rien dire.
 *
 * Vide, elle ne se contente plus de le constater : elle propose de créer un
 * schéma, ou d'en ouvrir un d'exemple qui montre ce qu'un schéma sait dire.
 */
export function SchemasScreen() {
  const { t, m, fmt } = useI18n();
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
  /** Ce qui remplacera le brouillon, en attente de confirmation. */
  const [pending, setPending] = useState<(() => void) | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  /** Remplace le brouillon, après avoir demandé s'il porte du travail. */
  const replaceDraft = (action: () => void) => {
    if (worthKeeping(saveState, draft)) setPending(() => action);
    else action();
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
      const tactic = parseTacticFile(await readJsonFile(file));
      await save(tactic);
      setImportError(null);
      setImported(tactic.name || t('board.untitled'));
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
          {t('schemas.imported', { name: imported })}
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
          <p className="uwh-muted m-0 mt-4 text-sm">
            {fmt.plural(schemas.length, m.schemas.count, {
              count: schemas.length,
            })}
          </p>
          <ul className="uwh-library">
            {schemas.map(schema => {
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

      <ConfirmDialog
        open={pending !== null}
        destructive
        title={t('schemas.replaceConfirm')}
        message={t('schemas.replaceBody')}
        confirmLabel={t('schemas.replaceAction')}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
