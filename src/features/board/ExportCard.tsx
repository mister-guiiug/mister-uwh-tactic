import { useState } from 'react';
import { Film, Printer, QrCode } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { useI18n } from '../../i18n/index.ts';
import { sceneCanvas } from './canvasRegistry.ts';
import { canRecord, fileName, recordCanvas } from './exporting.ts';
import { QR_CAPACITY, shortShareUrl } from './share.ts';
import { boardStore, useBoard } from './store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

interface Props {
  /** La vue 3D est-elle affichée (la vidéo s'enregistre depuis elle) ? */
  has3d: boolean;
  onPrint: () => void;
}

/**
 * EMPORTER LA PHASE HORS DE L'APPLICATION : l'imprimer (une vignette par
 * étape, à plastifier pour le bord du bassin), l'enregistrer en vidéo depuis
 * la 3D, ou la montrer en QR code à quelqu'un qui n'a pas le lien.
 */
export function ExportCard({ has3d, onPrint }: Props) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const steps = useBoard(s => s.tactic.steps.length);
  const [recording, setRecording] = useState(false);
  const [qr, setQr] = useState<{ src: string | null; bytes: number } | null>(
    null
  );

  /**
   * LA VIDÉO : on rejoue la phase depuis le début et on filme le canevas
   * jusqu'à la dernière étape.
   */
  const record = async () => {
    const canvas = sceneCanvas();
    if (!canvas) {
      toast.show(t('export.videoNeeds3d'), { tone: 'error' });
      return;
    }
    const store = boardStore;
    store.getState().goTo(0);
    setRecording(true);
    const done = new Promise<void>(resolve => {
      const unsubscribe = store.subscribe(state => {
        if (!state.playing) {
          unsubscribe();
          resolve();
        }
      });
    });
    store.getState().play();
    const ok = await recordCanvas(
      canvas,
      done,
      fileName(store.getState().tactic.name)
    );
    setRecording(false);
    toast.show(ok ? t('export.videoSaved') : t('export.videoUnsupported'), {
      tone: ok ? 'success' : 'error',
    });
  };

  const openQr = async () => {
    const url = await shortShareUrl(boardStore.getState().tactic, appBase());
    const bytes = new TextEncoder().encode(url).length;
    if (bytes > QR_CAPACITY) {
      setQr({ src: null, bytes });
      return;
    }
    try {
      const src = await qrToDataUrl(url, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: 'L',
        loader: () => import('uqr'),
      });
      setQr({ src, bytes });
    } catch {
      setQr({ src: null, bytes });
    }
  };

  return (
    <Card className="mt-3 flex flex-col gap-3">
      <CardHeader title={t('export.title')} subtitle={t('export.hint')} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onPrint}>
          <Printer size={18} aria-hidden="true" />
          {t('export.print')}
        </Button>
        <Button
          variant="outline"
          loading={recording}
          disabled={!has3d || steps < 2 || !canRecord()}
          onClick={() => void record()}
        >
          <Film size={18} aria-hidden="true" />
          {recording ? t('export.recording') : t('export.video')}
        </Button>
        <Button variant="outline" onClick={() => void openQr()}>
          <QrCode size={18} aria-hidden="true" />
          {t('export.qr')}
        </Button>
      </div>
      {!has3d ? (
        <p className="m-0 text-sm" style={{ color: 'var(--dwc-text-soft)' }}>
          {t('export.videoHint')}
        </p>
      ) : null}
      <Sheet
        open={qr !== null}
        title={t('export.qrTitle')}
        onClose={() => setQr(null)}
      >
        {qr?.src ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={qr.src}
              alt={t('export.qrAlt')}
              width={320}
              height={320}
              className="uwh-qr"
            />
            <p className="m-0 text-sm">
              {t('export.qrSize', {
                bytes: fmt.number(qr.bytes),
                max: fmt.number(QR_CAPACITY),
              })}
            </p>
          </div>
        ) : qr ? (
          <p role="alert" className="m-0">
            {t('export.qrTooLong', {
              bytes: fmt.number(qr.bytes),
              max: fmt.number(QR_CAPACITY),
            })}
          </p>
        ) : null}
      </Sheet>
    </Card>
  );
}
