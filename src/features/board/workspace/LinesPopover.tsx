import { GitBranch, GitBranchPlus, Trash2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { Popover } from '../../../ui/Popover.tsx';
import { lineLabel } from '../lineLabel.ts';
import { LINE_NAME_MAX } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';
import { linesOf, variantOf, variantRefusal } from '../variants.ts';
import { noteUsage } from '../../../app/usage.ts';

interface Props {
  /**
   * Le mode simple (ADR 0020) : on passe d'une ligne à l'autre, sans en
   * créer, renommer ni supprimer.
   */
  readOnly?: boolean;
  /** Chaque valeur nouvelle ouvre le panneau : « Quoi de neuf » (ADR 0039). */
  openRequest?: number;
}

/**
 * LES LIGNES DE LA PHASE, depuis la frise (ADR 0027) : celle qu'on voit,
 * passer à une autre, en faire naître une de l'étape courante, la nommer,
 * la retirer. Le bouton dit sur quelle ligne on est dès qu'il y en a deux.
 *
 * Un panneau ancré plutôt qu'une rangée de plus sous le tableau : au
 * téléphone, la frise tient déjà sur une ligne de justesse, et la plupart
 * des phases n'ont pas de variante.
 */
export function LinesPopover({ readOnly = false, openRequest }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const doc = useBoard(s => s.doc);
  const line = useBoard(s => s.line);
  const step = useBoard(s => s.step);
  const actions = boardStore.getState();
  const lines = linesOf(doc);
  const many = lines.length > 1;
  const current = lineLabel(t, doc, line);
  const variant = variantOf(doc, line);
  const refusal = variantRefusal(doc, line, step);
  const ownName = variant ? variant.name : (doc.mainLine ?? '');

  const remove = () => {
    if (!variant) return;
    const name = current;
    actions.removeVariant();
    const toastId = `variante-retiree-${variant.id}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('variants.removed', { line: name })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            actions.undo();
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  return (
    <Popover
      label={t('variants.title')}
      align="end"
      placement="above"
      className="uwh-lines"
      openRequest={openRequest}
      trigger={props =>
        many ? (
          <Button
            variant="ghost"
            className="uwh-lines__trigger"
            aria-label={t('variants.openLine', { line: current })}
            title={current}
            data-variant={line === null ? undefined : ''}
            {...props}
          >
            <GitBranch size={18} aria-hidden="true" />
            <span className="uwh-lines__current">{current}</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            iconOnly
            aria-label={t('variants.open')}
            title={t('variants.open')}
            {...props}
          >
            <GitBranch size={20} aria-hidden="true" />
          </Button>
        )
      }
    >
      {close => (
        <div className="uwh-stack uwh-stack--tight">
          {readOnly ? null : (
            <p className="uwh-muted m-0 text-supporting">
              {t('variants.intro')}
            </p>
          )}
          {many ? (
            <ul className="uwh-lines__list" aria-label={t('variants.lines')}>
              {lines.map(item => (
                <li key={item.id ?? ''}>
                  <button
                    type="button"
                    className="uwh-lines__item"
                    aria-pressed={item.id === line}
                    onClick={() => {
                      actions.setLine(item.id);
                      close();
                    }}
                  >
                    <span className="uwh-lines__name">
                      {lineLabel(t, doc, item.id)}
                    </span>
                    {item.from === null ? null : (
                      <span className="uwh-lines__from">
                        {t('variants.from', { step: item.from + 1 })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {readOnly ? null : (
            <>
              {many ? (
                <TextField
                  label={t('variants.name')}
                  value={ownName}
                  placeholder={current}
                  maxLength={LINE_NAME_MAX}
                  onChange={event => actions.renameLine(event.target.value)}
                />
              ) : null}
              <Button
                variant="outline"
                disabled={refusal !== null}
                onClick={() => {
                  actions.createVariant();
                  noteUsage('variant');
                  // Le nom d'abord : en présentation, c'est lui qu'on lira.
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLInputElement>(
                        '.uwh-lines__panel input'
                      )
                      ?.focus()
                  );
                }}
              >
                <GitBranchPlus size={18} aria-hidden="true" />
                {t('variants.create', { step: step + 1 })}
              </Button>
              {refusal ? (
                <p className="uwh-muted m-0 text-supporting">
                  {t(`variants.refusal.${refusal}`)}
                </p>
              ) : null}
              {variant ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    remove();
                    close();
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
                  {t('variants.remove')}
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
