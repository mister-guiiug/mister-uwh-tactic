import { useId, useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { schemaVersions } from '../../backend/index.ts';
import { VERSIONS_PER_SCHEMA } from '../../backend/versions.ts';
import { useI18n } from '../../i18n/index.ts';
import { Board2D } from '../board/Board2D.tsx';
import { useBoardLabels } from '../board/labels.ts';
import type { Tactic } from '../board/model.ts';
import { useReplaceDraft } from '../board/replaceDraft.tsx';
import { boardStore } from '../board/store.ts';
import { restoreVersion } from './restoreVersion.ts';
import './versions.css';

/**
 * LES VERSIONS D'UN SCHÉMA (ADR 0034), dans la feuille qu'ouvre le menu
 * « ⋯ » de sa vignette. Chargé à la demande, comme l'éditeur d'étiquettes :
 * l'accueil n'en porte que l'entrée du menu et l'étagère.
 *
 * Une rangée par version, la plus récente d'abord : la première étape
 * dessinée, la date, le nombre d'étapes — et le nom, s'il a changé depuis.
 * « Revenir à cette version » l'enregistre comme la nouvelle ; la courante
 * passe dans l'historique, et la notification permet d'y revenir aussitôt.
 */
export function SchemaVersions({ schema }: { schema: Tactic }) {
  const { t, m, fmt } = useI18n();
  const labels = useBoardLabels();
  const toast = useToast();
  const replaceDraft = useReplaceDraft();
  const uid = useId();
  const [busy, setBusy] = useState(false);
  // Lues une fois à l'ouverture, relues après chaque retour : c'est le seul
  // geste qui les change tant que la feuille est ouverte.
  const [versions, setVersions] = useState(() =>
    schemaVersions.list(schema.id)
  );
  const reread = () => setVersions(schemaVersions.list(schema.id));
  const when = (version: Tactic) =>
    fmt.dateTime(version.updatedAt, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  /**
   * ANNULER LE RETOUR : revenir à celle qu'on vient de quitter, rangée dans
   * l'historique. Le tableau la reprend s'il montre encore, telle quelle, la
   * version qu'on avait choisie — pas s'il a été retouché depuis.
   */
  const undo = async (left: Tactic, shown: Tactic) => {
    try {
      const back = await restoreVersion(left);
      reread();
      const { doc } = boardStore.getState();
      if (doc.id === back.id && doc.updatedAt === shown.updatedAt) {
        boardStore.getState().load(back);
      }
    } catch {
      toast.show(t('versions.failed'), { tone: 'error' });
    }
  };

  const comeBack = async (version: Tactic) => {
    const left = schema;
    setBusy(true);
    try {
      const next = await restoreVersion(version);
      reread();
      // OUVERT AU TABLEAU, IL SUIT. Un travail que la bibliothèque n'avait
      // pas se rend d'un geste (ADR 0008), comme à l'ouverture d'un schéma.
      if (boardStore.getState().doc.id === next.id) {
        replaceDraft(() => boardStore.getState().load(next));
      }
      const toastId = `version-reprise-${next.id}-${next.updatedAt}`;
      toast.show(
        <span className="flex flex-wrap items-center gap-2">
          {t('versions.restored', { date: when(version) })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.dismiss(toastId);
              void undo(left, next);
            }}
          >
            {t('schemas.undo')}
          </Button>
        </span>,
        { id: toastId, duration: 8_000 }
      );
    } catch {
      toast.show(t('versions.failed'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0 text-supporting">
        {t('versions.hint', { max: VERSIONS_PER_SCHEMA })}
      </p>
      {versions.length === 0 ? (
        <p className="m-0">{t('versions.empty')}</p>
      ) : (
        <ul className="uwh-versions" aria-label={t('versions.list')}>
          {versions.map((version, index) => {
            const dateId = `${uid}-${index}`;
            return (
              <li
                key={`${version.updatedAt}-${index}`}
                className="uwh-versions__item"
              >
                {/* Une image : la date et les étapes disent la version. */}
                <div className="uwh-versions__preview" aria-hidden="true">
                  <Board2D
                    labels={labels}
                    tactic={version}
                    orientation="landscape"
                  />
                </div>
                <div className="uwh-versions__body">
                  <p id={dateId} className="uwh-versions__date m-0">
                    {when(version)}
                  </p>
                  <p className="uwh-muted m-0 text-supporting">
                    {fmt.plural(version.steps.length, m.board.stepCount, {
                      count: version.steps.length,
                    })}
                  </p>
                  {version.name !== schema.name ? (
                    <p className="uwh-muted m-0 text-supporting">
                      {t('versions.renamed', {
                        name: version.name || t('board.untitled'),
                      })}
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    aria-describedby={dateId}
                    onClick={() => void comeBack(version)}
                  >
                    {t('versions.restore')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
