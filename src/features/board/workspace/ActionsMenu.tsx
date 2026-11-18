import { useState, type ReactNode } from 'react';
import {
  FilePlus2,
  Film,
  ImageDown,
  LayoutGrid,
  Link2,
  Maximize2,
  Printer,
  QrCode,
} from 'lucide-react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { downloadBlob } from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../../../i18n/index.ts';
import { useBoardLabels } from '../labels.ts';
import { sceneCanvas } from '../canvasRegistry.ts';
import { canRecord, fileName, recordCanvas } from '../exporting.ts';
import { shareOrCopy } from '@mister-guiiug/dev-pwa-config/share';
import { QR_CAPACITY, shareUrl, shortShareUrl } from '../share.ts';
import { boardStore, useBoard } from '../store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

interface Props {
  open: boolean;
  onClose: () => void;
  /** La vue 3D est-elle affichée (la vidéo s'enregistre depuis elle) ? */
  has3d: boolean;
  onPrint: () => void;
  onPresent: () => void;
  onNew: () => void;
}

function MenuItem({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="uwh-menu__item"
        disabled={disabled}
        onClick={onClick}
      >
        <span className="uwh-menu__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="uwh-menu__text">
          <span>{label}</span>
          {hint ? <span className="uwh-menu__hint">{hint}</span> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * CE QU'ON FAIT DU SCHÉMA, SOUS « ⋯ » : le partager, le montrer en QR code,
 * l'imprimer, l'enregistrer en vidéo, le présenter, en commencer un autre.
 *
 * Avant la refonte, ces six gestes étaient éparpillés sur la page — trois
 * boutons dans la barre, trois dans une carte « Emporter la phase » sous le
 * tableau — et la barre en débordait sur deux lignes. Ils sont rares ; ils
 * sont rangés ensemble, chacun avec la phrase qui dit ce qu'il fait.
 */
export function ActionsMenu({
  open,
  onClose,
  has3d,
  onPrint,
  onPresent,
  onNew,
}: Props) {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const tactic = useBoard(s => s.tactic);
  const labels = useBoardLabels();
  const [recording, setRecording] = useState(false);
  const [imaging, setImaging] = useState(false);
  const [qr, setQr] = useState<{ src: string | null; bytes: number } | null>(
    null
  );

  /** Ferme le menu, PUIS agit : une feuille ne s'ouvre pas sur une autre. */
  const then = (action: () => void) => () => {
    onClose();
    action();
  };

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

  /**
   * L'IMAGE DE L'ÉTAPE : partagée par la feuille du système quand il sait
   * partager un fichier (téléphone), téléchargée sinon. Le module qui la
   * dessine se charge au premier usage : il n'alourdit pas l'accueil.
   */
  /**
   * Une image, partagée par la feuille du système quand il sait partager un
   * fichier (téléphone), téléchargée sinon. Le module qui la dessine se
   * charge au premier usage : il n'alourdit pas l'accueil.
   */
  const shareImage = async (whole: boolean) => {
    setImaging(true);
    try {
      const { renderPhaseImage, renderStepImage } =
        await import('../stepImage.tsx');
      const { tactic: current, step } = boardStore.getState();
      const title = current.name || t('board.untitled');
      const total = current.steps.length;
      const stepLabel = (i: number) =>
        `${t('board.stepOf', { step: i + 1, total })} · ${fmt.number(
          current.steps[i]!.duration
        )} s`;
      const blob = whole
        ? await renderPhaseImage(current, labels, {
            title,
            subtitle: fmt.plural(total, m.board.stepCount, { count: total }),
            steps: current.steps.map((s, i) => ({
              label: stepLabel(i),
              note: s.note,
            })),
            brand: t('app.name'),
          })
        : await renderStepImage(current, step, labels, {
            title,
            subtitle: stepLabel(step),
            note: current.steps[step]!.note,
            brand: t('app.name'),
          });
      const name = whole
        ? `${fileName(current.name)}-phase.png`
        : `${fileName(current.name)}-etape-${step + 1}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        downloadBlob(blob, name);
        toast.show(t('export.imageSaved'), { tone: 'success' });
      }
    } catch (error) {
      // Fermer la feuille de partage n'est pas un échec.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.show(t('export.imageFailed'), { tone: 'error' });
      }
    } finally {
      setImaging(false);
    }
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

  const steps = tactic.steps.length;
  const videoBlocked = !has3d || steps < 2 || !canRecord();

  /**
   * LE LIEN, COMME UNE ENTRÉE PARMI LES AUTRES (ADR 0017). C'était un petit
   * bouton à contour, seul de son espèce au-dessus de la liste. La feuille
   * de partage du système au téléphone, le presse-papiers ailleurs.
   */
  const shareLink = async () => {
    const result = await shareOrCopy({
      title: tactic.name || t('board.untitled'),
      text: t('schemas.shareText'),
      url: shareUrl(tactic, appBase()),
    });
    if (result === 'copied') {
      toast.show(t('schemas.copied'), { tone: 'success' });
    } else if (result === 'failed') {
      toast.show(t('export.linkFailed'), { tone: 'error' });
    }
  };

  return (
    <>
      <Sheet
        open={open}
        title={t('board.menuTitle')}
        onClose={onClose}
        // Sur grand écran, au pointeur, la feuille se pose sous le bouton
        // « ⋯ » au lieu du centre de l'écran (`DropdownMenu` adaptatif
        // d'Astryx) ; elle garde son comportement de boîte : focus, Échap.
        className="uwh-actions-sheet"
      >
        <h3 className="uwh-menu__group" id="uwh-menu-share">
          {t('board.menuShare')}
        </h3>
        <ul className="uwh-menu" aria-labelledby="uwh-menu-share">
          <MenuItem
            icon={<Link2 size={20} />}
            label={t('export.link')}
            hint={t('export.linkHint')}
            onClick={then(() => void shareLink())}
          />
          <MenuItem
            icon={<ImageDown size={20} />}
            label={imaging ? t('export.imageWorking') : t('export.image')}
            hint={t('export.imageHint')}
            disabled={imaging}
            onClick={then(() => void shareImage(false))}
          />
          {steps > 1 ? (
            <MenuItem
              icon={<LayoutGrid size={20} />}
              label={
                imaging ? t('export.imageWorking') : t('export.phaseImage')
              }
              hint={t('export.phaseImageHint')}
              disabled={imaging}
              onClick={then(() => void shareImage(true))}
            />
          ) : null}
          <MenuItem
            icon={<QrCode size={20} />}
            label={t('export.qr')}
            onClick={then(() => void openQr())}
          />
          <MenuItem
            icon={<Printer size={20} />}
            label={t('export.print')}
            onClick={then(onPrint)}
          />
        </ul>
        <h3 className="uwh-menu__group" id="uwh-menu-show">
          {t('board.menuShow')}
        </h3>
        <ul className="uwh-menu" aria-labelledby="uwh-menu-show">
          <MenuItem
            icon={<Film size={20} />}
            label={recording ? t('export.recording') : t('export.video')}
            hint={has3d ? undefined : t('export.videoHint')}
            disabled={videoBlocked || recording}
            onClick={then(() => void record())}
          />
          <MenuItem
            icon={<Maximize2 size={20} />}
            label={t('board.present')}
            hint={t('board.presentHint')}
            onClick={then(onPresent)}
          />
        </ul>
        <h3 className="uwh-menu__group" id="uwh-menu-schema">
          {t('board.menuSchema')}
        </h3>
        <ul className="uwh-menu" aria-labelledby="uwh-menu-schema">
          <MenuItem
            icon={<FilePlus2 size={20} />}
            label={t('board.new')}
            hint={t('board.newHint')}
            onClick={then(onNew)}
          />
        </ul>
      </Sheet>
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
            <p className="m-0 text-supporting">
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
    </>
  );
}
