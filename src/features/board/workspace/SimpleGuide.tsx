import { X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../../i18n/index.ts';
import { GESTURES, type GuideProgress } from './guide.ts';

export const GUIDE_KEY = 'mister-uwh-tactic:guide-simple';

/**
 * LA PREMIÈRE PHASE, GUIDÉE (ADR 0020, suite). « Difficile à utiliser » veut
 * souvent dire « je ne sais pas par où commencer » — et l'idée d'étape ne
 * se devine pas. Quatre gestes, dans l'ordre, chacun reconnu sur le tableau
 * lui-même : le guide avance tout seul quand le geste est fait, et ne
 * reparaît plus une fois fini ou passé. Le tableau montre du doigt ce qu'il
 * faut toucher (`guideTarget`).
 */
export function SimpleGuide({
  progress,
  onDone,
}: {
  progress: GuideProgress;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const [done, setDone] = useLocalStorage<boolean>(GUIDE_KEY, false);

  if (done) return null;

  const { at, finished } = progress;
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
      {/* UNE LIGNE, PAS UNE CARTE (21/11/2026) : sur trois rangées, la carte
          laissait 81 px de terrain à un iPhone SE — et 9 px une fois un
          joueur touché. « 1/4 » à l'œil, la phrase entière au lecteur. */}
      <p className="uwh-guide__text" aria-live="polite">
        {finished ? (
          <strong>{t('guide.done')}</strong>
        ) : (
          <>
            <strong aria-hidden="true">
              {at + 1}/{GESTURES.length}
            </strong>
            <span className="sr-only">
              {t('guide.progress', { n: at + 1, total: GESTURES.length })}
            </span>{' '}
            {t(`guide.${GESTURES[at]!}`)}
          </>
        )}
      </p>
      {finished ? (
        <Button size="sm" variant="primary" onClick={() => close('fini')}>
          {t('guide.finish')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          aria-label={t('guide.skip')}
          onClick={() => close('passe')}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
