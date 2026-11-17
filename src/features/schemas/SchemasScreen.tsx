import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FolderOpen, Trash2, Upload } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
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
import { useI18n } from '../../i18n/index.ts';
import { boardStore } from '../board/store.ts';
import { shareUrl } from '../board/share.ts';
import { parseTacticFile, toTacticFile } from './file.ts';
import { useSchemas } from './store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/**
 * LA BIBLIOTHÈQUE DES SCHÉMAS : ouvrir, partager, exporter, supprimer.
 *
 * Un schéma ouvert REMPLACE le brouillon du tableau. C'est pourquoi le
 * tableau propose « Enregistrer » avant tout : la bibliothèque garde les
 * versions qu'on a voulu garder, le brouillon n'est que la page en cours.
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
  const toast = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (id: string) => {
    const tactic = schemas.find(s => s.id === id);
    if (!tactic) return;
    boardStore.getState().load(tactic);
    void navigate('/');
  };

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
  const removeWithUndo = (id: string) => {
    const schema = schemas.find(s => s.id === id);
    if (!schema) return;
    void remove(id);
    const toastId = `schema-supprime-${id}`;
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

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
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
        <ul className="mt-4 flex list-none flex-col gap-3 p-0">
          {schemas.map(schema => (
            <li key={schema.id}>
              <Card className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 text-base font-semibold break-words">
                    {schema.name || t('board.untitled')}
                  </h2>
                  <p
                    className="m-0 text-sm"
                    style={{ color: 'var(--dwc-text-soft)' }}
                  >
                    {fmt.plural(schema.steps.length, m.board.stepCount, {
                      count: schema.steps.length,
                    })}
                    {' · '}
                    {fmt.relative(schema.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => open(schema.id)}
                  >
                    <FolderOpen size={16} aria-hidden="true" />
                    {t('schemas.open')}
                  </Button>
                  <ShareButton
                    className="uwh-share"
                    title={schema.name || t('board.untitled')}
                    text={t('schemas.shareText')}
                    url={shareUrl(schema, appBase())}
                    label={t('schemas.share')}
                    copiedLabel={t('schemas.copied')}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadJson(
                        toTacticFile(schema),
                        `schema-${dateSlug(schema.updatedAt)}.json`
                      )
                    }
                  >
                    <Download size={16} aria-hidden="true" />
                    {t('schemas.export')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={t('schemas.remove', {
                      name: schema.name || t('board.untitled'),
                    })}
                    onClick={() => removeWithUndo(schema.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
