import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Play,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { shareOrCopy } from '@mister-guiiug/dev-pwa-config/share';
import { useI18n } from '../../i18n/index.ts';
import type { Tactic } from '../board/model.ts';
import { useReplaceDraft } from '../board/replaceDraft.tsx';
import { QR_CAPACITY } from '../board/share.ts';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { SEANCE_LIMITS, totalMinutes, type Seance } from './model.ts';
import { seanceShareUrl } from './share.ts';
import { flushSeances, useSeancePlay, useSeances } from './store.ts';

const appBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/** Les schémas de la bibliothèque, par identifiant. */
function useLibrary() {
  const { schemas, ready, load } = useSchemas();
  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);
  return useMemo(
    () => new Map(schemas.map(schema => [schema.id, schema] as const)),
    [schemas]
  );
}

/** Les séances, lues au besoin : celles du compte, ou de l'appareil. */
function useSeancesReady() {
  const ready = useSeances(state => state.ready);
  const load = useSeances(state => state.load);
  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);
  return ready;
}

/**
 * PRÉSENTER UNE SÉANCE : la première phase dont le schéma existe s'ouvre sur
 * le tableau, en présentation. Le tableau offre ensuite « Phase suivante ».
 */
function usePresent() {
  const navigate = useNavigate();
  const replaceDraft = useReplaceDraft();
  const library = useLibrary();
  return (seance: Seance, from = 0) => {
    const index = seance.items.findIndex(
      (item, i) => i >= from && library.has(item.schemaId)
    );
    const schema =
      index < 0 ? undefined : library.get(seance.items[index]!.schemaId);
    if (!schema) return false;
    replaceDraft(() => {
      boardStore.getState().load(schema);
      useSeancePlay.getState().start(seance.id, index);
      void navigate('/', { state: { present: true } });
    });
    return true;
  };
}

/**
 * LES SÉANCES (ADR 0018) : enchaîner des schémas de la bibliothèque pour un
 * entraînement — une durée et une consigne par phase —, puis les présenter
 * au bord du bassin, une phase après l'autre. Avec un compte, elles le
 * suivent d'un appareil à l'autre ; un lien les donne à quelqu'un d'autre.
 */
export function SeancesScreen() {
  const { id } = useParams();
  const { t } = useI18n();
  const ready = useSeancesReady();
  const error = useSeances(state => state.error);
  if (!ready) {
    return <SkeletonGroup label={t('seances.loading')} lines={4} />;
  }
  return (
    <>
      {error ? <ErrorBanner message={error} className="mb-3" /> : null}
      {id ? <SeanceEditor id={id} /> : <SeancesList />}
    </>
  );
}

function SeancesList() {
  const { t, m, fmt } = useI18n();
  const navigate = useNavigate();
  const seances = useSeances(state => state.seances);
  const outside = useSeances(state => state.outside);
  const present = usePresent();
  const toast = useToast();

  const add = () => {
    const seance = useSeances.getState().create(createUuid());
    void navigate(`/seances/${seance.id}`);
  };

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0">{t('seances.intro')}</p>
      <div>
        <Button variant="primary" onClick={add}>
          <Plus size={18} aria-hidden="true" />
          {t('seances.create')}
        </Button>
      </div>
      {seances.length === 0 ? (
        <EmptyState
          title={t('seances.empty')}
          description={t('seances.emptyHint')}
        />
      ) : (
        <ul className="uwh-seances" aria-label={t('seances.title')}>
          {seances.map(seance => (
            <li key={seance.id} className="uwh-seances__row">
              <Link to={`/seances/${seance.id}`} className="uwh-seances__open">
                <span className="uwh-seances__name">
                  {seance.name || t('seances.untitled')}
                </span>
                <span className="uwh-muted text-supporting">
                  {fmt.plural(seance.items.length, m.seances.summary, {
                    count: seance.items.length,
                    minutes: totalMinutes(seance),
                  })}
                </span>
              </Link>
              <Button
                variant="ghost"
                iconOnly
                aria-label={t('seances.presentNamed', {
                  name: seance.name || t('seances.untitled'),
                })}
                onClick={() => {
                  if (!present(seance)) {
                    toast.show(t('seances.nothingToPresent'), { tone: 'info' });
                  }
                }}
              >
                <Play size={20} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {outside.length > 0 ? <OutsideSeances seances={outside} /> : null}
    </div>
  );
}

/**
 * HORS DU COMPTE : les séances préparées sur cet appareil avant de se
 * connecter, ou par quelqu'un d'autre sur une tablette de club — comme les
 * schémas (ADR 0015). La connexion ne les range pas d'elle-même ; on les
 * ajoute à son compte d'un geste, et les schémas qu'elles présentent
 * suivent.
 */
function OutsideSeances({ seances }: { seances: Seance[] }) {
  const { t, m, fmt } = useI18n();
  const adopt = useSeances(state => state.adopt);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const add = async (ids: string[]) => {
    setBusy(true);
    try {
      const count = await adopt(ids);
      if (count > 0) {
        toast.show(fmt.plural(count, m.seances.adopted, { count }), {
          tone: 'success',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="uwh-outside"
      aria-labelledby="uwh-outside-seances-title"
    >
      <h2 id="uwh-outside-seances-title" className="uwh-outside__title">
        {t('schemas.outsideTitle')}
      </h2>
      <p className="uwh-muted m-0 text-supporting">
        {t('seances.outsideHint')}
      </p>
      {seances.length > 1 ? (
        <div className="uwh-row">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void add(seances.map(s => s.id))}
          >
            <CloudUpload size={18} aria-hidden="true" />
            {fmt.plural(seances.length, m.seances.adoptAll, {
              count: seances.length,
            })}
          </Button>
        </div>
      ) : null}
      <ul className="uwh-seances">
        {seances.map(seance => {
          const name = seance.name || t('seances.untitled');
          return (
            <li key={seance.id} className="uwh-seances__row">
              <span className="uwh-seances__open">
                <span className="uwh-seances__name">{name}</span>
                <span className="uwh-muted text-supporting">
                  {fmt.plural(seance.items.length, m.seances.summary, {
                    count: seance.items.length,
                    minutes: totalMinutes(seance),
                  })}
                </span>
              </span>
              {/* Le nom COMMENCE par le texte visible (axe,
                  label-content-name-mismatch), comme pour les schémas. */}
              <Button
                variant="primary"
                disabled={busy}
                aria-label={`${t('schemas.adopt')} : « ${name} »`}
                onClick={() => void add([seance.id])}
              >
                <CloudUpload size={18} aria-hidden="true" />
                {t('schemas.adopt')}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SeanceEditor({ id }: { id: string }) {
  const { t, m, fmt } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const library = useLibrary();
  const present = usePresent();
  const seance = useSeances(state => state.seances.find(s => s.id === id));
  const actions = useSeances.getState();
  const { schemas } = useSchemas();
  const [pick, setPick] = useState('');
  const [sharing, setSharing] = useState(false);

  // Ce qu'on vient de taper s'écrit en quittant l'éditeur, sans attendre.
  useEffect(() => flushSeances, []);

  if (!seance) {
    return (
      <EmptyState
        title={t('seances.notFound')}
        description={t('seances.notFoundHint')}
        action={
          <Button onClick={() => void navigate('/seances')}>
            {t('seances.back')}
          </Button>
        }
      />
    );
  }

  const nameOf = (schema: Tactic | undefined) =>
    schema ? schema.name || t('board.untitled') : t('seances.missing');

  const removeWithUndo = () => {
    const kept = seance;
    actions.remove(kept.id);
    void navigate('/seances');
    const toastId = `seance-supprimee-${kept.id}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('seances.removed', { name: kept.name || t('seances.untitled') })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            actions.restore(kept);
          }}
        >
          {t('schemas.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  const full = seance.items.length >= SEANCE_LIMITS.items;
  const presentable = seance.items.some(item => library.has(item.schemaId));

  return (
    <div className="uwh-stack">
      <TextField
        label={t('seances.name')}
        placeholder={t('seances.namePlaceholder')}
        maxLength={SEANCE_LIMITS.name}
        value={seance.name}
        onChange={event => actions.rename(seance.id, event.target.value)}
      />
      <p className="uwh-muted m-0" aria-live="polite">
        {fmt.plural(seance.items.length, m.seances.summary, {
          count: seance.items.length,
          minutes: totalMinutes(seance),
        })}
      </p>

      {seance.items.length > 0 ? (
        <ol className="uwh-seance">
          {seance.items.map((item, index) => {
            const schema = library.get(item.schemaId);
            const name = nameOf(schema);
            return (
              <li
                key={`${item.schemaId}-${index}`}
                className="uwh-seance__item"
                data-missing={schema ? undefined : true}
              >
                <div className="uwh-seance__head">
                  <span className="uwh-seance__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="uwh-seance__name">{name}</span>
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={t('seances.up', { name })}
                    disabled={index === 0}
                    onClick={() =>
                      actions.moveItem(seance.id, index, index - 1)
                    }
                  >
                    <ChevronUp size={20} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={t('seances.down', { name })}
                    disabled={index === seance.items.length - 1}
                    onClick={() =>
                      actions.moveItem(seance.id, index, index + 1)
                    }
                  >
                    <ChevronDown size={20} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={t('seances.removeItem', { name })}
                    onClick={() => actions.removeItem(seance.id, index)}
                  >
                    <Trash2 size={20} aria-hidden="true" />
                  </Button>
                </div>
                <div className="uwh-seance__fields">
                  <TextField
                    type="number"
                    inputMode="numeric"
                    label={t('seances.minutes', { n: index + 1 })}
                    min={SEANCE_LIMITS.minutes.min}
                    max={SEANCE_LIMITS.minutes.max}
                    value={item.minutes}
                    onChange={event => {
                      if (event.target.value !== '') {
                        actions.updateItem(seance.id, index, {
                          minutes: Number(event.target.value),
                        });
                      }
                    }}
                  />
                  <TextField
                    label={t('seances.note', { n: index + 1 })}
                    placeholder={t('seances.notePlaceholder')}
                    maxLength={SEANCE_LIMITS.note}
                    value={item.note}
                    onChange={event =>
                      actions.updateItem(seance.id, index, {
                        note: event.target.value,
                      })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="uwh-muted m-0">{t('seances.noItems')}</p>
      )}

      {schemas.length === 0 ? (
        <p className="m-0">
          {t('seances.noSchemas')}{' '}
          <Link to="/schemas">{t('seances.toLibrary')}</Link>
        </p>
      ) : (
        <div className="uwh-seance__add">
          <SelectField
            label={t('seances.pick')}
            value={pick}
            disabled={full}
            onChange={event => setPick(event.target.value)}
          >
            <option value="">{t('seances.pickPlaceholder')}</option>
            {schemas.map(schema => (
              <option key={schema.id} value={schema.id}>
                {nameOf(schema)}
              </option>
            ))}
          </SelectField>
          <Button
            disabled={!pick || full}
            onClick={() => {
              actions.addItem(seance.id, pick);
              setPick('');
            }}
          >
            <Plus size={18} aria-hidden="true" />
            {t('seances.add')}
          </Button>
        </div>
      )}
      {full ? (
        <p className="uwh-muted m-0">
          {t('seances.full', { max: SEANCE_LIMITS.items })}
        </p>
      ) : null}

      <div className="uwh-seance__actions">
        <Button
          variant="primary"
          disabled={!presentable}
          onClick={() => present(seance)}
        >
          <Play size={18} aria-hidden="true" />
          {t('seances.present')}
        </Button>
        <Button
          variant="outline"
          disabled={!presentable}
          onClick={() => setSharing(true)}
        >
          <Share2 size={18} aria-hidden="true" />
          {t('seances.share')}
        </Button>
        <Button className="uwh-danger" onClick={removeWithUndo}>
          <Trash2 size={18} aria-hidden="true" />
          {t('seances.remove')}
        </Button>
      </div>
      {sharing ? (
        <ShareSeance
          seance={seance}
          library={library}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </div>
  );
}

interface Prepared {
  url: string;
  bytes: number;
  /** Le QR code, ou `null` quand le lien dépasse ce qu'il peut tenir. */
  qr: string | null;
}

/**
 * LE PARTAGE D'UNE SÉANCE : le lien, prêt à envoyer, et son QR code quand il
 * tient dedans. Le lien est fabriqué à l'ouverture de la feuille — compresser
 * est asynchrone — pour que « Envoyer le lien » appelle la feuille de partage
 * du système dans le geste même, sans attente qui la ferait refuser.
 *
 * TROP LONG POUR UN QR CODE (`QR_CAPACITY`), le QR n'est pas proposé : un
 * code illisible au bord du bassin ferait perdre plus de temps qu'un lien
 * envoyé par message.
 */
function ShareSeance({
  seance,
  library,
  onClose,
}: {
  seance: Seance;
  library: ReadonlyMap<string, Tactic>;
  onClose: () => void;
}) {
  const { t, m, fmt } = useI18n();
  const toast = useToast();
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  // Le lien de la séance telle qu'elle est À L'OUVERTURE de la feuille.
  const [opened] = useState(() => ({ seance, library }));

  const kept = seance.items.filter(item => library.has(item.schemaId));
  const schemaCount = new Set(kept.map(item => item.schemaId)).size;
  const missing = seance.items.length - kept.length;

  useEffect(() => {
    let current = true;
    void (async () => {
      const url = await seanceShareUrl(
        opened.seance,
        opened.library,
        appBase()
      );
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
      if (current) setPrepared({ url, bytes, qr });
    })();
    return () => {
      current = false;
    };
  }, [opened]);

  const send = async () => {
    if (!prepared) return;
    const result = await shareOrCopy({
      title: seance.name || t('seances.untitled'),
      text: t('seances.shareText'),
      url: prepared.url,
    });
    if (result === 'copied') {
      toast.show(t('schemas.copied'), { tone: 'success' });
    } else if (result === 'failed') {
      toast.show(t('export.linkFailed'), { tone: 'error' });
    }
  };

  return (
    <Sheet open title={t('seances.shareTitle')} onClose={onClose}>
      <div className="uwh-stack">
        <p className="uwh-muted m-0 text-supporting">
          {fmt.plural(schemaCount, m.seances.shareHint, {
            count: schemaCount,
          })}
          {missing > 0
            ? ` ${fmt.plural(missing, m.seances.shareMissing, {
                count: missing,
              })}`
            : null}
        </p>
        {prepared ? (
          <>
            <TextField
              label={t('seances.shareLink')}
              value={prepared.url}
              readOnly
              onFocus={event => event.currentTarget.select()}
            />
            <div>
              <Button variant="primary" onClick={() => void send()}>
                <Share2 size={18} aria-hidden="true" />
                {t('seances.shareSend')}
              </Button>
            </div>
            {prepared.qr ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={prepared.qr}
                  alt={t('seances.shareQrAlt')}
                  width={320}
                  height={320}
                  className="uwh-qr"
                />
                <p className="m-0 text-supporting">
                  {t('export.qrSize', {
                    bytes: fmt.number(prepared.bytes),
                    max: fmt.number(QR_CAPACITY),
                  })}
                </p>
              </div>
            ) : prepared.bytes > QR_CAPACITY ? (
              <p className="uwh-muted m-0 text-supporting">
                {t('seances.shareQrTooLong', {
                  bytes: fmt.number(prepared.bytes),
                  max: fmt.number(QR_CAPACITY),
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="uwh-muted m-0" aria-live="polite">
            {t('seances.sharePreparing')}
          </p>
        )}
      </div>
    </Sheet>
  );
}
