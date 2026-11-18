import { useId, type ReactNode } from 'react';

interface Props {
  label: ReactNode;
  /** Une phrase sous le libellé : ce que la bascule change. */
  hint?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * UNE BASCULE, PAS UNE CASE DE TREIZE PIXELS.
 *
 * L'audit UX du 18/11/2026 mesurait les cases à cocher du tableau à 13 px :
 * sous les 24 px de WCAG 2.5.8, loin des 44 px qu'on vise au doigt. La
 * ligne entière est la cible (le `label` englobe le champ), haute de
 * 2,75 rem au moins ; le champ reste une vraie case, `role="switch"`, pour
 * que le lecteur d'écran dise « activé » plutôt que « coché ».
 */
export function Switch({ label, hint, checked, disabled, onChange }: Props) {
  const hintId = useId();
  return (
    <label className="uwh-switch" data-disabled={disabled ? '' : undefined}>
      <span className="uwh-switch__text">
        <span>{label}</span>
        {hint ? (
          <span id={hintId} className="uwh-switch__hint">
            {hint}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="uwh-switch__input"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={event => onChange(event.target.checked)}
      />
    </label>
  );
}
