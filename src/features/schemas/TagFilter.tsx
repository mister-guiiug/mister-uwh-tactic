import { useId } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { tagKey, tagLabel } from '../board/tags.ts';

/**
 * LES PUCES DU FILTRE (ADR 0029), au-dessus de la liste : « Toutes », puis
 * chaque étiquette que porte au moins un schéma. Un seul choix à la fois,
 * combiné à la recherche et au tri : des boutons radio, que le clavier
 * parcourt aux flèches, habillés en puces de 44 px pour le doigt.
 */
export function TagFilter({
  tags,
  value,
  onChange,
}: {
  tags: readonly string[];
  value: string | null;
  onChange: (tag: string | null) => void;
}) {
  const { t, m } = useI18n();
  const group = useId();
  const chip = (tag: string | null, label: string) => (
    <label key={tag ?? ''} className="uwh-chip">
      <input
        type="radio"
        name={group}
        checked={
          tag === null || value === null
            ? tag === value
            : tagKey(tag) === tagKey(value)
        }
        onChange={() => onChange(tag)}
      />
      {label}
    </label>
  );
  return (
    <fieldset className="uwh-chips mt-4">
      <legend className="sr-only">{t('tags.filter')}</legend>
      {chip(null, t('tags.all'))}
      {tags.map(tag => chip(tag, tagLabel(tag, m.tags.suggested)))}
    </fieldset>
  );
}
