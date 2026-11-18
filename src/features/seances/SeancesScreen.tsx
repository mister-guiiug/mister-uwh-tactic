import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import { useI18n } from '../../i18n/index.ts';
import type { Tactic } from '../board/model.ts';
import { useReplaceDraft } from '../board/replaceDraft.tsx';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { SEANCE_LIMITS, totalMinutes, type Seance } from './model.ts';
import { useSeancePlay, useSeances } from './store.ts';

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
 * au bord du bassin, une phase après l'autre.
 */
export function SeancesScreen() {
  const { id } = useParams();
  return id ? <SeanceEditor id={id} /> : <SeancesList />;
}

function SeancesList() {
  const { t, m, fmt } = useI18n();
  const navigate = useNavigate();
  const { seances, create } = useSeances();
  const present = usePresent();
  const toast = useToast();

  const add = () => {
    const seance = create(createUuid());
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
    </div>
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
            const back = actions.create(kept.id, kept.name);
            for (const item of kept.items)
              actions.addItem(back.id, item.schemaId);
            kept.items.forEach((item, i) =>
              actions.updateItem(back.id, i, item)
            );
          }}
        >
          {t('schemas.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  const full = seance.items.length >= SEANCE_LIMITS.items;

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
          disabled={!seance.items.some(item => library.has(item.schemaId))}
          onClick={() => present(seance)}
        >
          <Play size={18} aria-hidden="true" />
          {t('seances.present')}
        </Button>
        <Button className="uwh-danger" onClick={removeWithUndo}>
          <Trash2 size={18} aria-hidden="true" />
          {t('seances.remove')}
        </Button>
      </div>
    </div>
  );
}
