import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import type { PhaseVideoState } from './usePhaseVideo.ts';

interface Props {
  state: PhaseVideoState;
  onCancel: () => void;
  onDeliver: () => void;
}

/**
 * LA PHASE EN VIDÉO, SA FEUILLE (ADR 0021) : l'avancement du rendu et de
 * quoi l'annuler, puis le fichier prêt à partir — partagé là où le système
 * sait partager un fichier, enregistré ailleurs, comme l'image de la phase.
 */
export function VideoSheet({ state, onCancel, onDeliver }: Props) {
  const { t, fmt } = useI18n();
  const ready = state.phase === 'ready';
  const shareable =
    ready && Boolean(navigator.canShare?.({ files: [state.file] }));

  return (
    <Sheet
      open={state.phase !== 'idle'}
      title={t('video.title')}
      onClose={onCancel}
      footer={
        ready ? (
          <Button variant="primary" block onClick={onDeliver}>
            {shareable ? t('video.share') : t('video.save')}
          </Button>
        ) : (
          <Button variant="secondary" block onClick={onCancel}>
            {t('video.cancel')}
          </Button>
        )
      }
    >
      {state.phase === 'working' ? (
        <div className="uwh-video">
          <progress
            className="uwh-video__bar"
            aria-label={t('video.progressLabel')}
            max={state.total || 1}
            value={state.done}
          />
          <p className="m-0 text-supporting">
            {state.total
              ? t('video.progress', {
                  done: fmt.number(state.done),
                  total: fmt.number(state.total),
                })
              : t('video.preparing')}
          </p>
        </div>
      ) : ready ? (
        <p className="m-0" role="status">
          {t('video.ready', {
            seconds: fmt.number(state.seconds, { maximumFractionDigits: 1 }),
            size: fmt.bytes(state.file.size),
          })}
        </p>
      ) : null}
    </Sheet>
  );
}
