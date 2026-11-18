import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import {
  Gavel,
  ListOrdered,
  MousePointer2,
  Ruler,
  Timer,
  Users,
} from 'lucide-react';
import { useI18n } from '../../../i18n/index.ts';
import { PANEL_TABS, type PanelTab } from './panelTabs.ts';

const ICONS: Record<PanelTab, ReactNode> = {
  selection: <MousePointer2 size={18} aria-hidden="true" />,
  step: <ListOrdered size={18} aria-hidden="true" />,
  teams: <Users size={18} aria-hidden="true" />,
  rules: <Gavel size={18} aria-hidden="true" />,
  apnea: <Timer size={18} aria-hidden="true" />,
  pool: <Ruler size={18} aria-hidden="true" />,
};

interface Props {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  /** Une pastille sur un onglet (les alertes d'apnée). */
  badges?: Partial<Record<PanelTab, { count: number; label: string }>>;
  children: ReactNode;
}

/**
 * LE PANNEAU CONTEXTUEL : six onglets au lieu de huit cartes empilées.
 *
 * L'audit UX du 18/11/2026 mesurait l'accueil à 3,9 écrans de haut sur un
 * téléphone, parce que chaque fonction avait sa carte sous le tableau :
 * sélection, étapes, apnée, composition, situations, export, effectifs. Le
 * panneau les range par ce sur quoi elles agissent — le jeton, l'étape, les
 * équipes, le règlement, l'apnée, le bassin — et n'en montre qu'une à la
 * fois. À droite du tableau sur grand écran, dessous sur un téléphone.
 *
 * Les onglets suivent le motif ARIA : flèches gauche et droite, Début et Fin,
 * un seul onglet dans l'ordre de tabulation.
 */
export function ContextPanel({ tab, onTab, badges, children }: Props) {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, '');
  const list = useRef<HTMLDivElement>(null);
  const tabId = (name: PanelTab) => `${uid}-tab-${name}`;
  const panelId = `${uid}-panel`;

  const onKey = (event: KeyboardEvent) => {
    const index = PANEL_TABS.indexOf(tab);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % PANEL_TABS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + PANEL_TABS.length) % PANEL_TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? PANEL_TABS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const name = PANEL_TABS[next]!;
    onTab(name);
    list.current?.querySelector<HTMLElement>(`#${tabId(name)}`)?.focus();
  };

  return (
    <section className="uwh-panel" aria-label={t('panel.label')}>
      <div
        ref={list}
        role="tablist"
        aria-label={t('panel.label')}
        className="uwh-panel__tabs"
      >
        {PANEL_TABS.map(name => {
          const badge = badges?.[name];
          return (
            <button
              key={name}
              id={tabId(name)}
              type="button"
              role="tab"
              className="uwh-panel__tab"
              aria-selected={tab === name}
              aria-controls={panelId}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => onTab(name)}
              onKeyDown={onKey}
            >
              {ICONS[name]}
              <span>{t(`panel.${name}`)}</span>
              {badge && badge.count > 0 ? (
                <span className="uwh-panel__badge">
                  <span aria-hidden="true">{badge.count}</span>
                  <span className="sr-only">{badge.label}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="uwh-panel__body"
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  );
}
