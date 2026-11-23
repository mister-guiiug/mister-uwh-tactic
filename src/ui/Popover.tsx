import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Le nom du panneau, pour un lecteur d'écran. */
  label: string;
  /** Le bouton qui l'ouvre : il reçoit ses attributs ARIA et son geste. */
  trigger: (props: {
    id: string;
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
  }) => ReactNode;
  /** Le côté où s'aligne le panneau, sous ou au-dessus du bouton. */
  align?: 'start' | 'end';
  placement?: 'below' | 'above';
  /** Le contenu ; `close` le referme, après un choix. */
  children: (close: () => void) => ReactNode;
  className?: string;
  /**
   * UNE DEMANDE D'OUVERTURE VENUE D'AILLEURS que du bouton — un lien de
   * « Quoi de neuf » (ADR 0039). Chaque valeur nouvelle ouvre le panneau ;
   * celle qu'on trouve au montage, non : c'est une demande d'avant.
   */
  openRequest?: number;
}

/** La marge gardée au bord de la fenêtre, et l'écart au bouton. */
const EDGE = 8;

/**
 * LE BAS DE LA PLACE LIBRE : la fenêtre, moins la barre de navigation collée
 * en bas (`BottomNav` du socle) quand elle est là. Sans elle, un menu ouvert
 * près du bas s'ouvrait dessous, glissait sous la barre, et le message « …
 * enregistré » posé juste au-dessus en couvrait un article — relevé par la
 * CI sous Linux, dont les polices plus larges poussent les cartes plus bas.
 */
function floorOfWindow(): number {
  const nav = document.querySelector('[data-dwc="bottom-nav"]');
  const top = nav?.getBoundingClientRect().top;
  return top !== undefined && top > 0 && top < window.innerHeight
    ? top
    : window.innerHeight;
}
const GAP = 4;

/**
 * UN PANNEAU ANCRÉ À SON BOUTON (ADR 0017, `Popover` d'Astryx) : « Calques »
 * sur le terrain, le menu « ⋯ » d'une carte de la bibliothèque.
 *
 * RENDU AU NIVEAU DE LA PAGE (portail), placé en `fixed` d'après le bouton.
 * Posé dans la carte, le menu était ROGNÉ par elle : `overflow: hidden` et
 * `content-visibility: auto` (qui contient le dessin) n'en laissaient
 * paraître que le bord — on ne voyait pas le menu, on ne pouvait pas le
 * toucher (relevé en ligne le 18/11/2026). Aucun conteneur ne peut plus le
 * couper. Il s'ouvre au-dessus quand la place manque dessous, et reste dans
 * la fenêtre.
 *
 * Non modal, à dessein : le terrain reste visible et utilisable autour. Il se
 * referme par Échap — le focus revient au bouton —, par un clic au-dehors,
 * quand le focus le quitte, ou après un choix. Le premier contrôle du
 * panneau prend le focus à l'ouverture.
 *
 * Le socle n'en a pas : sa `Sheet` est une boîte modale. S'il en faut un
 * ailleurs dans la famille, c'est ce fichier qui monte.
 */
export function Popover({
  label,
  trigger,
  align = 'end',
  placement = 'below',
  children,
  className,
  openRequest,
}: Props) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const [request, setRequest] = useState(openRequest);
  if (openRequest !== request) {
    setRequest(openRequest);
    if (openRequest !== undefined && !open) {
      // Caché jusqu'à ce qu'il soit placé, comme au toucher du bouton.
      setStyle({ visibility: 'hidden' });
      setOpen(true);
    }
  }
  const id = useId().replace(/:/g, '');
  const triggerId = `${id}-trigger`;
  const root = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /** Refermer, et rendre le focus au bouton : le clavier ne se perd pas. */
  const close = () => {
    setOpen(false);
    document.getElementById(triggerId)?.focus({ preventScroll: true });
  };

  /** Sous le bouton (ou dessus, faute de place), aligné, dans la fenêtre. */
  const place = useCallback(() => {
    const button = document.getElementById(triggerId);
    const box = panel.current;
    if (!button || !box) return;
    const anchor = button.getBoundingClientRect();
    const width = box.offsetWidth;
    const height = box.offsetHeight;
    const below = floorOfWindow() - anchor.bottom - GAP - EDGE;
    const above = anchor.top - GAP - EDGE;
    const up =
      placement === 'above'
        ? above >= height || above > below
        : below < height && above > below;
    const top = up ? anchor.top - GAP - height : anchor.bottom + GAP;
    // Aligné comme demandé ; s'il n'y a pas la place de ce côté, de l'autre
    // côté du bouton plutôt que collé au bord de la fenêtre.
    const fromEnd = anchor.right - width;
    const fromStart = anchor.left;
    const wanted =
      align === 'end'
        ? fromEnd >= EDGE
          ? fromEnd
          : fromStart
        : fromStart + width <= window.innerWidth - EDGE
          ? fromStart
          : fromEnd;
    const left = Math.min(
      Math.max(EDGE, wanted),
      window.innerWidth - width - EDGE
    );
    setStyle({
      top: Math.max(EDGE, top),
      left: Math.max(EDGE, left),
      // La hauteur du côté choisi : un menu plus long défile, il ne passe pas
      // sous la barre.
      maxHeight: Math.max(up ? above : below, 160),
    });
  }, [align, placement, triggerId]);

  // Mesuré avant la première peinture : le panneau ne paraît qu'à sa place.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, [tabindex="0"]'
      )
      ?.focus({ preventScroll: true });
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (!!root.current?.contains(target) || !!panel.current?.contains(target));
    const outside = (event: PointerEvent) => {
      if (!inside(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !inside(event.target)) return;
      event.stopPropagation();
      setOpen(false);
      document.getElementById(triggerId)?.focus({ preventScroll: true });
    };
    // Le focus qui sort du panneau (Tab) le referme : rendu à la fin de la
    // page, il ne doit pas laisser une fenêtre ouverte derrière le clavier.
    const leave = (event: FocusEvent) => {
      if (inside(event.target) && !inside(event.relatedTarget)) {
        if (event.relatedTarget) setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('focusout', leave);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    // Un contenu qui grandit ouvert (un champ qui paraît après un choix) se
    // replace : ouvert au-dessus du bouton, il le recouvrait sinon.
    const grows =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (panel.current) grows?.observe(panel.current);
    return () => {
      grows?.disconnect();
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusout', leave);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, triggerId]);

  // Un `span` : le bouton peut vivre dans une phrase (un mot du lexique
  // dans une consigne) ; le panneau, lui, est rendu au bout de la page.
  return (
    <span
      ref={root}
      className={['uwh-popover', className].filter(Boolean).join(' ')}
    >
      {trigger({
        id: triggerId,
        'aria-expanded': open,
        'aria-controls': id,
        onClick: () => {
          // Caché jusqu'à ce qu'il soit placé : pas d'image au mauvais endroit.
          if (!open) setStyle({ visibility: 'hidden' });
          setOpen(value => !value);
        },
      })}
      {open
        ? createPortal(
            <div
              ref={panel}
              id={id}
              role="dialog"
              aria-label={label}
              className={[
                'uwh-popover__panel',
                className && `${className}__panel`,
              ]
                .filter(Boolean)
                .join(' ')}
              style={style}
            >
              {children(close)}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
