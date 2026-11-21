import { useState, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../i18n/index.ts';
import { TAG_LIMITS } from '../board/model.ts';
import {
  hasTag,
  SUGGESTED_TAGS,
  tagFromInput,
  tagKey,
  tagLabel,
  toggleTag,
} from '../board/tags.ts';

/**
 * POSER LES ÉTIQUETTES D'UN SCHÉMA (ADR 0029), dans la feuille qu'ouvre le
 * menu « ⋯ » de sa vignette. Chargé à la demande : l'accueil n'en porte que
 * les puces du filtre.
 *
 * Une puce par étiquette offerte, cochée si le schéma la porte : les
 * proposées, puis les libres déjà posées ailleurs dans la bibliothèque — on
 * retrouve « Cadets » sans la retaper. Le champ en ajoute une : le nom d'une
 * proposée dans la langue de l'écran redonne la proposée. Chaque geste est
 * enregistré tout de suite, comme une case qu'on coche.
 */
export function TagEditor({
  tags,
  library,
  onChange,
}: {
  tags: readonly string[];
  /** Les étiquettes présentes dans la bibliothèque. */
  library: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const { t, m } = useI18n();
  const labels = m.tags.suggested;
  const [text, setText] = useState('');
  // Une libre décochée reste offerte tant que la feuille est ouverte : elle
  // ne disparaît pas sous le doigt qui vient de la décocher.
  const [seen, setSeen] = useState<readonly string[]>(tags);
  const offered = new Map<string, string>();
  for (const tag of [...SUGGESTED_TAGS, ...library, ...seen, ...tags]) {
    if (!offered.has(tagKey(tag))) offered.set(tagKey(tag), tag);
  }
  const full = tags.length >= TAG_LIMITS.count;

  const add = (event: FormEvent) => {
    event.preventDefault();
    const tag = tagFromInput(text, id => labels[id]);
    if (tag === null || full) return;
    setText('');
    setSeen(before => [...before, tag]);
    if (!hasTag(tags, tag)) onChange(toggleTag(tags, tag));
  };

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0 text-supporting">{t('tags.hint')}</p>
      <fieldset className="uwh-chips">
        <legend className="sr-only">{t('tags.label')}</legend>
        {[...offered].map(([key, tag]) => {
          const on = hasTag(tags, tag);
          return (
            <label key={key} className="uwh-chip">
              <input
                type="checkbox"
                checked={on}
                disabled={!on && full}
                onChange={() => onChange(toggleTag(tags, tag))}
              />
              {on ? <Check size={16} aria-hidden="true" /> : null}
              {tagLabel(tag, labels)}
            </label>
          );
        })}
      </fieldset>
      <p className="m-0 text-supporting" aria-live="polite">
        {full ? t('tags.full', { max: TAG_LIMITS.count }) : ''}
      </p>
      <form className="uwh-stack uwh-stack--tight" onSubmit={add}>
        <TextField
          label={t('tags.field')}
          hint={t('tags.limit', {
            max: TAG_LIMITS.count,
            length: TAG_LIMITS.length,
          })}
          placeholder={t('tags.placeholder')}
          value={text}
          maxLength={TAG_LIMITS.length}
          disabled={full}
          onChange={event => setText(event.target.value)}
        />
        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={full || text.trim() === ''}
          >
            <Plus size={18} aria-hidden="true" />
            {t('tags.add')}
          </Button>
        </div>
      </form>
    </div>
  );
}
