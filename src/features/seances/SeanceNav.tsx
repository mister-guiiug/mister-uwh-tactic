import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../i18n/index.ts';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { TermText } from '../lexique/TermText.tsx';
import { formatClock, timeLeft } from './clock.ts';
import { useSeancePlay } from './play.ts';
import { useSeances } from './store.ts';

/** L'heure, relue chaque seconde tant que le chronomètre tourne. */
function useNow(running: boolean): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return [now, () => setNow(Date.now())];
}

/** Deux brèves : le téléphone posé au bord du bassin se fait sentir. */
const SIGNAL = [200, 100, 200];

/**
 * DANS LA BARRE DE PRÉSENTATION, LA SÉANCE : où l'on en est, sa consigne, la
 * phase d'avant ou d'après — et le chronomètre de la phase (ADR 0018, suivi
 * du 20/11/2026). Le temps prévu écoulé, le téléphone vibre une fois, le
 * chronomètre compte le dépassement et « Phase suivante » passe au premier
 * plan. Une phase dont le schéma a disparu de la bibliothèque est sautée
 * plutôt que de laisser un écran vide au bord du bassin.
 */
export function SeanceNav() {
  const { t } = useI18n();
  const { seanceId, index, goTo, clock } = useSeancePlay();
  const seance = useSeances(state =>
    state.seances.find(s => s.id === seanceId)
  );
  const schemas = useSchemas(state => state.schemas);
  const paused = clock.pausedAt !== null;
  const [now, refresh] = useNow(!paused);
  const item = seance?.items[index];
  const left = item ? timeLeft(clock, item.minutes, now) : 1;
  const over = left <= 0;

  // Le signal, une fois par phase : l'état le retient, pas l'écran.
  useEffect(() => {
    if (!over || clock.rang || !item) return;
    useSeancePlay.getState().ring();
    navigator.vibrate?.(SIGNAL);
  }, [over, clock.rang, item]);

  if (!seance) return null;

  const playable = (i: number) => {
    const at = seance.items[i];
    return at ? schemas.find(s => s.id === at.schemaId) : undefined;
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
        refresh();
        return;
      }
    }
  };
  const hasPrevious = seance.items.some((_, i) => i < index && playable(i));
  const hasNext = seance.items.some((_, i) => i > index && playable(i));
  const time = formatClock(left);

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
      {item ? (
        <>
          <span
            className={`uwh-seance-nav__clock${over ? ' uwh-seance-nav__clock--over' : ''}`}
            role="timer"
            aria-label={
              over
                ? t('seances.clockOver', { time })
                : t('seances.clockLeft', { time })
            }
          >
            {time}
          </span>
          <Button
            variant="ghost"
            iconOnly
            aria-label={
              paused ? t('seances.resumeClock') : t('seances.pauseClock')
            }
            aria-pressed={paused}
            onClick={() => {
              const play = useSeancePlay.getState();
              if (paused) play.resume();
              else play.pause();
              refresh();
            }}
          >
            {paused ? (
              <Play size={18} aria-hidden="true" />
            ) : (
              <Pause size={18} aria-hidden="true" />
            )}
          </Button>
        </>
      ) : null}
      {/* Dit une fois, quand le temps tombe : le lecteur d'écran ne suit
          pas chaque seconde. */}
      <span className="sr-only" aria-live="polite">
        {over ? t('seances.timeUp') : ''}
      </span>
      <Button
        variant={over && hasNext ? 'primary' : 'ghost'}
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
