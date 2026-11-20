import { useEffect, useRef, useState } from 'react';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { downloadBlob } from '@mister-guiiug/dev-pwa-config/download';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../../i18n/index.ts';
import { fileName } from '../exporting.ts';
import { useBoardLabels } from '../labels.ts';
import { boardStore } from '../store.ts';

export type PhaseVideoState =
  | { phase: 'idle' }
  | { phase: 'working'; done: number; total: number }
  | { phase: 'ready'; file: File; seconds: number; title: string };

/**
 * LA PHASE EN VIDÉO, côté écran (ADR 0021) : lancer le rendu, le suivre,
 * l'annuler, puis partager le fichier. Le rendu lui-même (`video/render.ts`)
 * se charge au premier clic.
 *
 * LE PARTAGE ATTEND UN SECOND GESTE. `navigator.share` exige un geste
 * récent, et le rendu d'une phase dure plus que les quelques secondes que
 * le navigateur accorde : partager à la fin du rendu échouerait au
 * téléphone. La feuille propose donc le bouton quand la vidéo est prête.
 */
export function usePhaseVideo() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const labels = useBoardLabels();
  const [state, setState] = useState<PhaseVideoState>({ phase: 'idle' });
  const running = useRef<AbortController | null>(null);

  // L'écran quitté arrête le rendu.
  useEffect(() => () => running.current?.abort(), []);

  const start = async () => {
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setState({ phase: 'working', done: 0, total: 0 });
    try {
      const { renderPhaseVideo } = await import('../video/render.ts');
      const tactic = boardStore.getState().tactic;
      const title = tactic.name || t('board.untitled');
      const total = tactic.steps.length;
      const video = await renderPhaseVideo(
        tactic,
        labels,
        speed => ({
          title,
          brand: t('app.name'),
          steps: tactic.steps.map((step, i) => {
            const label = t('board.stepOf', { step: i + 1, total });
            const faster = t('video.faster', {
              speed: fmt.number(speed, { maximumFractionDigits: 1 }),
            });
            return {
              label: speed > 1 ? `${label} · ${faster}` : label,
              note: step.note,
            };
          }),
        }),
        {
          signal: controller.signal,
          onProgress: (done, frames) =>
            setState({ phase: 'working', done, total: frames }),
        }
      );
      trackEvent('video_phase', {
        codec: video.codec,
        secondes: Math.round(video.seconds),
      });
      const file = new File(
        [video.blob],
        `${fileName(tactic.name)}-phase.${video.extension}`,
        { type: video.blob.type }
      );
      setState({ phase: 'ready', file, seconds: video.seconds, title });
    } catch {
      if (controller.signal.aborted) return;
      setState({ phase: 'idle' });
      toast.show(t('video.failed'), { tone: 'error' });
    } finally {
      if (running.current === controller) running.current = null;
    }
  };

  /** Annule le rendu en cours, ou renonce à la vidéo prête. */
  const cancel = () => {
    running.current?.abort();
    running.current = null;
    setState({ phase: 'idle' });
  };

  const deliver = async () => {
    if (state.phase !== 'ready') return;
    const { file, title } = state;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        downloadBlob(file, file.name);
        toast.show(t('video.saved'), { tone: 'success' });
      }
      setState({ phase: 'idle' });
    } catch (error) {
      // Fermer la feuille de partage n'est pas un échec : la vidéo reste là.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.show(t('video.failed'), { tone: 'error' });
      }
    }
  };

  return { state, start, cancel, deliver };
}
