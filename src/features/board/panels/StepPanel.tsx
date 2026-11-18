import {
  ArrowLeft,
  ArrowRight,
  CopyPlus,
  FlipVertical2,
  Trash2,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import {
  TextAreaField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { STEP_DURATION } from '../model.ts';
import {
  MAX_STEPS,
  SPEEDS,
  boardStore,
  useBoard,
  type Speed,
} from '../store.ts';

interface Props {
  formatDistance: (metres: number) => string;
}

/**
 * L'ÉTAPE EN COURS : sa durée en jeu réel (l'apnée s'en déduit), sa
 * consigne, ses flèches, et ce qu'on fait des étapes — dupliquer, supprimer,
 * replacer à l'engagement. La vitesse de lecture est ici aussi : elle règle
 * la frise, sans prendre de place sous le tableau.
 */
export function StepPanel({ formatDistance }: Props) {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const step = useBoard(s => s.step);
  const total = useBoard(s => s.tactic.steps.length);
  const current = useBoard(s => s.tactic.steps[s.step]!);
  const speed = useBoard(s => s.speed);
  const actions = boardStore.getState();

  return (
    <div className="uwh-stack">
      <p className="m-0 font-semibold">
        {t('board.stepOf', { step: step + 1, total })}
        <span className="uwh-muted font-normal">
          {' · '}
          {fmt.plural(total, m.board.stepCount, { count: total })}
        </span>
      </p>
      <div className="uwh-row">
        <Button
          variant="outline"
          disabled={total >= MAX_STEPS}
          onClick={actions.addStep}
        >
          <CopyPlus size={18} aria-hidden="true" />
          {t('board.addStep')}
        </Button>
        <Button
          variant="ghost"
          disabled={total < 2}
          onClick={actions.removeStep}
        >
          <Trash2 size={18} aria-hidden="true" />
          {t('board.removeStep')}
        </Button>
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.moveStepEarlier')}
          disabled={step === 0}
          onClick={() => actions.moveStep(-1)}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.moveStepLater')}
          disabled={step >= total - 1}
          onClick={() => actions.moveStep(1)}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
      <TextField
        label={t('board.duration', { step: step + 1 })}
        type="number"
        inputMode="numeric"
        min={STEP_DURATION.min}
        max={STEP_DURATION.max}
        value={current.duration}
        onChange={event => {
          if (event.target.value !== '') {
            actions.setDuration(Number(event.target.value));
          }
        }}
      />
      <TextAreaField
        label={t('board.note', { step: step + 1 })}
        placeholder={t('board.notePlaceholder')}
        rows={3}
        maxLength={280}
        value={current.note}
        onChange={event => actions.setNote(event.target.value)}
      />
      {current.arrows.length > 0 ? (
        <section className="uwh-stack uwh-stack--tight">
          <h3 className="uwh-subtitle">
            {t('arrows.listTitle', { step: step + 1 })}
          </h3>
          <ul className="uwh-list">
            {current.arrows.map((arrow, i) => (
              <li key={i} className="uwh-list__item">
                <span className="uwh-arrow-swatch" data-kind={arrow.kind} />
                <span className="flex-1">
                  {t('arrows.describe', {
                    kind: t(`arrows.${arrow.kind}`),
                    length: formatDistance(
                      Math.hypot(
                        arrow.to.x - arrow.from.x,
                        arrow.to.y - arrow.from.y
                      )
                    ),
                  })}
                </span>
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label={t('arrows.remove', { index: i + 1 })}
                  onClick={() => actions.removeArrow(i)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.playback')}</h3>
        <SegmentedControl
          ariaLabel={t('board.speed')}
          value={String(speed)}
          onChange={value => actions.setSpeed(Number(value) as Speed)}
          options={SPEEDS.map(s => ({
            value: String(s),
            label: `×${fmt.number(s)}`,
          }))}
        />
      </section>
      {/* LA MÊME PHASE SUR L'AUTRE AILE, d'un geste : elle se rejoue côté
          droit comme côté gauche, et « Annuler » la rend. */}
      <section className="uwh-stack uwh-stack--tight">
        <Button
          variant="outline"
          onClick={() => {
            actions.mirror();
            const toastId = `miroir-${Date.now()}`;
            toast.show(
              <span className="flex flex-wrap items-center gap-2">
                {t('board.mirrored')}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast.dismiss(toastId);
                    actions.undo();
                  }}
                >
                  {t('board.undo')}
                </Button>
              </span>,
              { id: toastId, duration: 8_000 }
            );
          }}
        >
          <FlipVertical2 size={18} aria-hidden="true" />
          {t('board.mirror')}
        </Button>
        <p className="uwh-muted m-0 text-sm">{t('board.mirrorHint')}</p>
      </section>
      <Button variant="ghost" onClick={actions.resetToKickoff}>
        {t('board.kickoff')}
      </Button>
    </div>
  );
}
