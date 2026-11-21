import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../../i18n/index.ts';
import { MARK_TEXT_MAX, ZONE_SHAPES, type ZoneShape } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';

/**
 * UN MOT SE RÉÉCRIT SUR PLACE. Vidé, il garde son texte au tableau — un mot
 * vide n'existe pas (`wordSchema`) — et le reprend en quittant le champ :
 * « Supprimer » est là pour le retirer.
 */
function WordField({ index, text }: { index: number; text: string }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(text);
  const [shown, setShown] = useState(text);
  // Un « Annuler », une suppression au-dessus : le champ suit le magasin.
  if (text !== shown) {
    setShown(text);
    setDraft(text);
  }
  return (
    <TextField
      label={t('marks.wordText', { index: index + 1 })}
      value={draft}
      maxLength={MARK_TEXT_MAX}
      autoComplete="off"
      onChange={event => {
        setDraft(event.target.value);
        boardStore.getState().setWordText(index, event.target.value);
      }}
      onBlur={() => setDraft(text)}
    />
  );
}

/**
 * LES ZONES ET LES MOTS DE L'ÉTAPE (ADR 0026), sous ses flèches : la forme
 * et l'étiquette d'une zone, le texte d'un mot, et de quoi les supprimer.
 * C'est aussi ce que lit un lecteur d'écran : sur le tableau, ils sont
 * dessinés, pas dits.
 */
export function StepMarks() {
  const { t } = useI18n();
  const step = useBoard(s => s.step);
  const zones = useBoard(s => s.tactic.steps[s.step]?.zones);
  const words = useBoard(s => s.tactic.steps[s.step]?.words);
  if (!zones && !words) return null;
  const actions = boardStore.getState();
  return (
    <section className="uwh-stack uwh-stack--tight">
      {zones ? (
        <>
          <h3 className="uwh-subtitle">
            {t('marks.zonesTitle', { step: step + 1 })}
          </h3>
          <ul className="uwh-list">
            {zones.map((zone, i) => (
              <li key={i} className="uwh-mark">
                <SelectField
                  label={t('marks.zoneShape', { index: i + 1 })}
                  value={zone.shape}
                  onChange={event =>
                    actions.setZone(i, {
                      shape: event.target.value as ZoneShape,
                    })
                  }
                >
                  {ZONE_SHAPES.map(shape => (
                    <option key={shape} value={shape}>
                      {t(`marks.${shape}`)}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label={t('marks.zoneLabel', { index: i + 1 })}
                  placeholder={t('marks.zoneLabelPlaceholder')}
                  value={zone.label ?? ''}
                  maxLength={MARK_TEXT_MAX}
                  autoComplete="off"
                  onChange={event =>
                    actions.setZone(i, { label: event.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label={t('marks.zoneRemove', { index: i + 1 })}
                  onClick={() => actions.removeZone(i)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {words ? (
        <>
          <h3 className="uwh-subtitle">
            {t('marks.wordsTitle', { step: step + 1 })}
          </h3>
          <ul className="uwh-list">
            {words.map((word, i) => (
              <li key={i} className="uwh-mark uwh-mark--word">
                <WordField index={i} text={word.text} />
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label={t('marks.wordRemove', { index: i + 1 })}
                  onClick={() => actions.removeWord(i)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="uwh-muted m-0 text-supporting">{t('marks.carried')}</p>
    </section>
  );
}
