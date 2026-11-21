import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { shareOrCopy } from '@mister-guiiug/dev-pwa-config/share';
import { useI18n } from '../../i18n/index.ts';
import type { Tactic } from '../board/model.ts';
import { QR_CAPACITY } from '../board/share.ts';
import { CARNET_LIMITS, carnetShareUrl, MESSAGE_LIMIT } from './share.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

interface Prepared {
  /** Le nom pour lequel ce lien a été fabriqué. */
  name: string;
  url: string;
  bytes: number;
  /** Le QR code, ou `null` quand le lien dépasse ce qu'il peut tenir. */
  qr: string | null;
}

/**
 * LE PARTAGE D'UN CARNET (ADR 0023) : un nom s'il en faut un, le lien, et
 * son QR code quand il tient dedans. Comme pour une séance, le lien est
 * fabriqué AVANT le clic — compresser est asynchrone — pour que « Envoyer le
 * lien » ouvre la feuille de partage du système dans le geste même. Un nom
 * tapé le refabrique ; tant qu'il n'est pas prêt, le bouton attend.
 *
 * Trop long pour un QR code (`QR_CAPACITY`), la feuille dit pourquoi il n'y
 * en a pas ; trop long pour une messagerie (`MESSAGE_LIMIT`), elle le dit
 * aussi : un lien coupé en route serait refusé chez le joueur.
 *
 * LE CORPS SEUL : la feuille (`Sheet`) est posée par l'écran Schémas. Tirée
 * d'ici, elle faisait sortir de l'accueil le piège de focus du socle dans un
 * morceau à part, préchargé quand même : +0,4 kB au préchargé, mesuré le
 * 21/11/2026.
 */
export function CarnetShare({ schemas }: { schemas: readonly Tactic[] }) {
  const { t, m, fmt } = useI18n();
  const toast = useToast();
  const [name, setName] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  // Les schémas tels qu'ils sont À L'OUVERTURE de la feuille.
  const [opened] = useState(schemas);
  const wanted = name.trim();
  const ready = prepared?.name === wanted ? prepared : null;

  useEffect(() => {
    let current = true;
    // Le premier lien tout de suite ; ensuite, quand la frappe s'arrête.
    const timer = window.setTimeout(
      () =>
        void (async () => {
          const url = await carnetShareUrl(opened, wanted, appBase());
          const bytes = new TextEncoder().encode(url).length;
          let qr: string | null = null;
          if (bytes <= QR_CAPACITY) {
            try {
              qr = await qrToDataUrl(url, {
                width: 640,
                margin: 2,
                errorCorrectionLevel: 'L',
                loader: () => import('uqr'),
              });
            } catch {
              qr = null;
            }
          }
          if (current) setPrepared({ name: wanted, url, bytes, qr });
        })(),
      wanted ? 300 : 0
    );
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [opened, wanted]);

  const send = async () => {
    if (!ready) return;
    const result = await shareOrCopy({
      title: ready.name || t('carnet.untitled'),
      text: t('carnet.shareText'),
      url: ready.url,
    });
    if (result === 'copied') {
      toast.show(t('schemas.copied'), { tone: 'success' });
    } else if (result === 'failed') {
      toast.show(t('export.linkFailed'), { tone: 'error' });
    }
  };

  const shown = ready ?? prepared;
  const bytes = shown ? fmt.number(shown.bytes) : '';

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0 text-supporting">
        {fmt.plural(opened.length, m.carnet.hint, { count: opened.length })}
      </p>
      <TextField
        label={t('carnet.name')}
        placeholder={t('carnet.namePlaceholder')}
        value={name}
        maxLength={CARNET_LIMITS.name}
        onChange={event => setName(event.target.value)}
      />
      {shown ? (
        <>
          <TextField
            label={t('carnet.link')}
            value={shown.url}
            readOnly
            onFocus={event => event.currentTarget.select()}
          />
          <div>
            <Button
              variant="primary"
              loading={!ready}
              onClick={() => void send()}
            >
              <Share2 size={18} aria-hidden="true" />
              {t('carnet.send')}
            </Button>
          </div>
          {shown.bytes > MESSAGE_LIMIT ? (
            <p className="uwh-carnet__warning m-0 text-supporting">
              {t('carnet.long', { bytes, max: fmt.number(MESSAGE_LIMIT) })}
            </p>
          ) : null}
          {shown.qr ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={shown.qr}
                alt={t('carnet.qrAlt')}
                width={320}
                height={320}
                className="uwh-qr"
              />
              <p className="m-0 text-supporting">
                {t('export.qrSize', {
                  bytes,
                  max: fmt.number(QR_CAPACITY),
                })}
              </p>
            </div>
          ) : shown.bytes > QR_CAPACITY ? (
            <p className="uwh-muted m-0 text-supporting">
              {t('carnet.qrTooLong', {
                bytes,
                max: fmt.number(QR_CAPACITY),
              })}
            </p>
          ) : null}
        </>
      ) : (
        <p className="uwh-muted m-0" aria-live="polite">
          {t('carnet.preparing')}
        </p>
      )}
    </div>
  );
}
