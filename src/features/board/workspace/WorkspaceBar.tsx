import { useDeferredValue, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Ellipsis, Redo2, Save, Undo2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { ShareButton } from '@mister-guiiug/dev-pwa-config/react/share-button';
import { useI18n } from '../../../i18n/index.ts';
import { boardStore, useBoard } from '../store.ts';
import { shareUrl } from '../share.ts';
import type { SaveState } from '../saveState.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

interface Props {
  saveState: SaveState;
  onSave: () => void;
  onMenu: () => void;
}

/**
 * LA BARRE DU SCHÉMA : son nom, où il en est, et les quatre gestes qu'on fait
 * sans y penser — annuler, rétablir, enregistrer, et le reste sous « ⋯ ».
 *
 * Avant la refonte, le nom était un champ de formulaire à libellé, suivi de
 * six boutons sur deux lignes ; le tableau commençait à 396 px sur un
 * téléphone (audit UX du 18/11/2026). Le nom est désormais le titre, éditable
 * en place ; l'état d'enregistrement se lit dessous, au lieu de ne se savoir
 * qu'en ouvrant la bibliothèque.
 *
 * C'EST LA SEULE BARRE DU TABLEAU (ADR 0017) : l'en-tête de l'application
 * s'y efface. Dès 768 px, elle porte le fil « Schémas › », d'où l'on vient
 * et où l'on retourne, et « Partager », le geste qu'on fait après chaque
 * séance de préparation ; au téléphone, il reste sous « ⋯ ».
 */
export function WorkspaceBar({ saveState, onSave, onMenu }: Props) {
  const { t } = useI18n();
  const name = useBoard(s => s.tactic.name);
  const pristine = useBoard(s => s.tactic.updatedAt === s.tactic.createdAt);
  const canUndo = useBoard(s => s.past.length > 0);
  const canRedo = useBoard(s => s.future.length > 0);
  const tactic = useBoard(s => s.tactic);
  const actions = boardStore.getState();
  // Le lien encode tout le schéma : différé, il ne se recalcule pas à chaque
  // pas d'un glissé, seulement quand le tableau se pose.
  const shared = useDeferredValue(tactic);
  const url = useMemo(() => shareUrl(shared, appBase()), [shared]);

  const status =
    saveState === 'saved'
      ? t('board.statusSaved')
      : saveState === 'dirty'
        ? t('board.statusDirty')
        : saveState === 'draft' && !pristine
          ? t('board.statusDraft')
          : '';

  return (
    <div className="uwh-bar">
      <nav className="uwh-bar__crumb" aria-label={t('board.breadcrumb')}>
        <Link to="/schemas">{t('nav.schemas')}</Link>
        <ChevronRight size={16} aria-hidden="true" />
      </nav>
      {/* Le bloc entier est la cible : 32 px de champ, mais 48 avec la
          ligne d'état, qu'un toucher envoie aussi au champ. */}
      <label className="uwh-bar__title">
        <input
          className="uwh-bar__name"
          aria-label={t('board.schemaName')}
          placeholder={t('board.untitled')}
          value={name}
          maxLength={60}
          onChange={event => actions.setName(event.target.value)}
        />
        <span
          className="uwh-bar__status"
          data-state={saveState}
          aria-live="polite"
        >
          {status}
        </span>
      </label>
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('board.undo')}
        title={t('board.undoKeys')}
        disabled={!canUndo}
        onClick={actions.undo}
      >
        <Undo2 size={20} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('board.redo')}
        title={t('board.redoKeys')}
        disabled={!canRedo}
        onClick={actions.redo}
      >
        <Redo2 size={20} aria-hidden="true" />
      </Button>
      <ShareButton
        className="uwh-bar__share"
        title={tactic.name || t('board.untitled')}
        text={t('schemas.shareText')}
        url={url}
        label={t('schemas.share')}
        copiedLabel={t('schemas.copied')}
      />
      <Button
        variant={saveState === 'saved' ? 'outline' : 'primary'}
        className="uwh-bar__save"
        aria-label={t('board.save')}
        onClick={onSave}
      >
        <Save size={18} aria-hidden="true" />
        <span className="uwh-bar__save-text" aria-hidden="true">
          {t('board.save')}
        </span>
      </Button>
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('board.more')}
        aria-haspopup="dialog"
        onClick={onMenu}
      >
        <Ellipsis size={22} aria-hidden="true" />
      </Button>
    </div>
  );
}
