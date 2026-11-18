import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Info,
  NotebookPen,
  Settings,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/index.ts';

function Entry({
  to,
  icon,
  title,
  hint,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <li>
      <Link to={to} className="uwh-entry">
        <span className="uwh-entry__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="uwh-entry__text">
          <span className="uwh-entry__title">{title}</span>
          <span className="uwh-entry__hint">{hint}</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * « PLUS » : ce qu'on ouvre rarement, rangé derrière une seule entrée.
 *
 * La barre basse avait cinq entrées, dont deux (Réglages, À propos) qu'on
 * visite une fois — et le compte, sixième, caché au fond des réglages. Elle
 * en garde trois qui servent à chaque entraînement (Tableau, Schémas,
 * Séances — ADR 0018) et celle-ci ; chaque destination y dit en une ligne ce qu'on y trouve, ce
 * qu'une icône de barre ne peut pas faire.
 */
export function PlusScreen() {
  const { t } = useI18n();
  return (
    <ul className="uwh-entries">
      <Entry
        to="/notes"
        icon={<NotebookPen size={22} />}
        title={t('notes.title')}
        hint={t('plus.notesHint')}
      />
      <Entry
        to="/lexique"
        icon={<BookOpen size={22} />}
        title={t('lexique.title')}
        hint={t('plus.lexiqueHint')}
      />
      <Entry
        to="/reglages"
        icon={<Settings size={22} />}
        title={t('settings.title')}
        hint={t('plus.settingsHint')}
      />
      <Entry
        to="/compte"
        icon={<UserRound size={22} />}
        title={t('account.title')}
        hint={t('plus.accountHint')}
      />
      <Entry
        to="/a-propos"
        icon={<Info size={22} />}
        title={t('about.title')}
        hint={t('plus.aboutHint')}
      />
    </ul>
  );
}
