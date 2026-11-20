import { useEffect, useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../../i18n/index.ts';
import { useBoard } from '../store.ts';

export const GUIDE_KEY = 'mister-uwh-tactic:guide-simple';

/**
 * LA PREMIÈRE PHASE, GUIDÉE (ADR 0020, suite). « Difficile à utiliser » veut
 * souvent dire « je ne sais pas par où commencer » — et l'idée d'étape ne
 * se devine pas. Quatre gestes, dans l'ordre, chacun reconnu sur le tableau
 * lui-même : le guide avance tout seul quand le geste est fait, et ne
 * reparaît plus une fois fini ou passé.
 */
export function SimpleGuide({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const [done, setDone] = useLocalStorage<boolean>(GUIDE_KEY, false);
  const steps = useBoard(s => s.tactic.steps);
  const index = useBoard(s => s.step);
  const playing = useBoard(s => s.playing);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (playing && steps.length > 1) setPlayed(true);
  }, [playing, steps.length]);

  if (done) return null;

  const current = steps[index];
  const dived = Object.entries(current?.poses ?? {}).some(
    ([id, pose]) => !id.startsWith('arbitre') && pose.surface === false
  );
  const carried = steps.some(step => step.carrier);
  const gestures = [
    { text: t('guide.dive'), met: dived },
    { text: t('guide.puck'), met: carried },
    { text: t('guide.step'), met: steps.length > 1 },
    { text: t('guide.play'), met: played },
  ];
  const at = gestures.findIndex(g => !g.met);
  const finished = at === -1;

  const close = (issue: 'fini' | 'passe') => {
    setDone(true);
    trackEvent('guide_simple', { issue, gestes: finished ? 4 : at });
    onDone?.();
  };

  return (
    <div
      className="uwh-modecard uwh-guide"
      role="region"
      aria-label={t('guide.title')}
    >
      <p className="m-0 font-semibold" aria-live="polite">
        {finished
          ? t('guide.done')
          : t('guide.progress', { n: at + 1, total: gestures.length })}
      </p>
      {finished ? null : <p className="m-0">{gestures[at]!.text}</p>}
      <div className="uwh-row">
        {finished ? (
          <Button size="sm" variant="primary" onClick={() => close('fini')}>
            {t('guide.finish')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => close('passe')}>
            {t('guide.skip')}
          </Button>
        )}
      </div>
    </div>
  );
}
