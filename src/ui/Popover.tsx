import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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
}

/**
 * UN PANNEAU ANCRÉ À SON BOUTON (ADR 0017, `Popover` d'Astryx) : « Calques »
 * sur le terrain, le menu « ⋯ » d'une carte de la bibliothèque.
 *
 * Non modal, à dessein : le terrain reste visible et utilisable autour. Il se
 * referme par Échap — le focus revient au bouton —, par un clic au-dehors, ou
 * après un choix. Le premier contrôle du panneau prend le focus à
 * l'ouverture, au clavier comme au doigt.
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
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const triggerId = `${id}-trigger`;

  /** Refermer, et rendre le focus au bouton : le clavier ne se perd pas. */
  const close = () => {
    setOpen(false);
    document.getElementById(triggerId)?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, [tabindex="0"]'
      )
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!root.current?.contains(event.target as Node)) return;
      event.stopPropagation();
      setOpen(false);
      document.getElementById(triggerId)?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, triggerId]);

  return (
    <div
      ref={root}
      className={['uwh-popover', className].filter(Boolean).join(' ')}
    >
      {trigger({
        id: triggerId,
        'aria-expanded': open,
        'aria-controls': id,
        onClick: () => setOpen(value => !value),
      })}
      {open ? (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          className="uwh-popover__panel"
          data-align={align}
          data-placement={placement}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}
