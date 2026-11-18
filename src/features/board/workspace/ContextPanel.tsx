import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { CircleDot, Gavel, ListOrdered, Ruler, Users } from 'lucide-react';
import { useI18n } from '../../../i18n/index.ts';
import { PANEL_TABS, type PanelTab } from './panelTabs.ts';

const ICONS: Record<PanelTab, ReactNode> = {
  step: <ListOrdered size={18} aria-hidden="true" />,
  token: <CircleDot size={18} aria-hidden="true" />,
  teams: <Users size={18} aria-hidden="true" />,
  rules: <Gavel size={18} aria-hidden="true" />,
  pool: <Ruler size={18} aria-hidden="true" />,
};

/** Les crans de la feuille, au téléphone (ADR 0017). */
export type SheetState = 'peek' | 'half' | 'full';
const CRANS: SheetState[] = ['peek', 'half', 'full'];

interface Props {
  id?: string;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  /** Au téléphone, le panneau est une feuille du bas, à trois crans. */
  compact: boolean;
  sheet: SheetState;
  onSheet: (sheet: SheetState) => void;
  children: ReactNode;
}

/**
 * LE PANNEAU CONTEXTUEL : cinq onglets rangés par ce sur quoi ils agissent —
 * l'étape, le jeton, les équipes, le règlement, le bassin (ADR 0017).
 *
 * À côté du terrain dès 768 px. Au téléphone, une FEUILLE DU BAS À CRANS
 * (`BottomSheet` d'Astryx) : fermée, sa poignée et ses onglets restent au-
 * dessus de la barre basse ; un onglet touché l'ouvre à mi-hauteur, le
 * terrain toujours visible ; la poignée se glisse ou se touche. Avant, le
 * panneau suivait la frise dans la page, et commençait sous la barre basse :
 * rien ne disait qu'il existait (audit du 18/11/2026).
 *
 * Fermée, son contenu est `inert` : ce qu'on ne voit pas ne prend pas le
 * focus. Échap la referme et rend le focus à la poignée.
 *
 * Les onglets suivent le motif ARIA : flèches gauche et droite, Début et Fin,
 * un seul onglet dans l'ordre de tabulation.
 */
export function ContextPanel({
  id,
  tab,
  onTab,
  compact,
  sheet,
  onSheet,
  children,
}: Props) {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, '');
  const list = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<number | null>(null);
  const dragged = useRef(false);
  const tabId = (name: PanelTab) => `${uid}-tab-${name}`;
  const panelId = `${uid}-panel`;
  const closed = compact && sheet === 'peek';

  const choose = (name: PanelTab) => {
    onTab(name);
    if (closed) onSheet('half');
  };

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

  /*
   * GLISSER LA POIGNÉE : un cran par geste franc, vers le haut ou le bas ;
   * un toucher sans glisser bascule entre fermée et mi-hauteur.
   */
  const onHandleDown = (event: PointerEvent<HTMLButtonElement>) => {
    drag.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onHandleUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current === null) return;
    const dy = event.clientY - drag.current;
    drag.current = null;
    if (Math.abs(dy) <= 24) return;
    const at = CRANS.indexOf(sheet);
    dragged.current = true;
    onSheet(CRANS[dy < 0 ? Math.min(at + 1, 2) : Math.max(at - 1, 0)]!);
  };
  // Un toucher, Entrée, Espace, un lecteur d'écran : le clic bascule — sauf
  // celui qui suit un glissé, déjà traité.
  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onSheet(sheet === 'peek' ? 'half' : 'peek');
  };

  // Échap, depuis la feuille ouverte : elle se referme, la poignée reprend
  // le focus.
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!compact || sheet === 'peek') return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!section.current?.contains(event.target as Node)) return;
      onSheet('peek');
      handle.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [compact, sheet, onSheet]);

  return (
    <section
      ref={section}
      id={id}
      className="uwh-panel"
      aria-label={t('panel.label')}
      data-sheet={compact ? sheet : undefined}
    >
      <button
        ref={handle}
        type="button"
        className="uwh-panel__handle"
        aria-label={sheet === 'peek' ? t('panel.expand') : t('panel.collapse')}
        aria-expanded={sheet !== 'peek'}
        aria-controls={panelId}
        // FERMÉE, LA POIGNÉE N'EST QU'UN REPÈRE À GLISSER : on ouvre la
        // feuille en touchant un onglet (48 px). Ouverte, c'est un vrai
        // bouton de 44 px, « Réduire le panneau ».
        tabIndex={closed ? -1 : undefined}
        aria-hidden={closed ? true : undefined}
        onPointerDown={onHandleDown}
        onPointerUp={onHandleUp}
        onPointerCancel={() => (drag.current = null)}
        onClick={onHandleClick}
      />
      <div
        ref={list}
        role="tablist"
        aria-label={t('panel.label')}
        className="uwh-panel__tabs"
      >
        {PANEL_TABS.map(name => (
          <button
            key={name}
            id={tabId(name)}
            type="button"
            role="tab"
            className="uwh-panel__tab"
            aria-selected={tab === name}
            aria-controls={panelId}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => choose(name)}
            onKeyDown={onKey}
          >
            {ICONS[name]}
            <span>{t(`panel.${name}`)}</span>
          </button>
        ))}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="uwh-panel__body"
        tabIndex={closed ? -1 : 0}
        inert={closed}
      >
        {children}
      </div>
    </section>
  );
}
