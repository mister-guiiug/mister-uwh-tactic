import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../i18n/index.ts';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { TermText } from '../lexique/TermText.tsx';
import { useSeancePlay, useSeances } from './store.ts';

/**
 * DANS LA BARRE DE PRÉSENTATION, LA SÉANCE : où l'on en est, sa consigne, et
 * la phase d'avant ou d'après. Une phase dont le schéma a disparu de la
 * bibliothèque est sautée plutôt que de laisser un écran vide au bord du
 * bassin.
 */
export function SeanceNav() {
  const { t } = useI18n();
  const { seanceId, index, goTo } = useSeancePlay();
  const seance = useSeances(state =>
    state.seances.find(s => s.id === seanceId)
  );
  const schemas = useSchemas(state => state.schemas);
  if (!seance) return null;

  const playable = (i: number) => {
    const item = seance.items[i];
    return item ? schemas.find(s => s.id === item.schemaId) : undefined;
  };
  const step = (direction: 1 | -1) => {
    for (
      let i = index + direction;
      i >= 0 && i < seance.items.length;
      i += direction
    ) {
      const schema = playable(i);
      if (schema) {
        boardStore.getState().load(schema);
        goTo(i);
        return;
      }
    }
  };
  const hasPrevious = seance.items.some((_, i) => i < index && playable(i));
  const hasNext = seance.items.some((_, i) => i > index && playable(i));
  const item = seance.items[index];

  return (
    <div className="uwh-seance-nav">
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('seances.previous')}
        disabled={!hasPrevious}
        onClick={() => step(-1)}
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </Button>
      <span className="uwh-seance-nav__where">
        <strong>
          {t('seances.phaseOf', {
            n: index + 1,
            total: seance.items.length,
          })}
        </strong>
        {item ? ` · ${t('seances.minutesShort', { n: item.minutes })}` : null}
        {item?.note ? (
          <span className="uwh-seance-nav__note">
            {' — '}
            <TermText text={item.note} />
          </span>
        ) : null}
      </span>
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('seances.next')}
        disabled={!hasNext}
        onClick={() => step(1)}
      >
        <ChevronRight size={22} aria-hidden="true" />
      </Button>
    </div>
  );
}
