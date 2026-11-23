import { useEffect, useId, useState, type FormEvent } from 'react';
/*
 * `CirclePlay` ET `CirclePause`, PAS `Play` ET `Pause` : ces deux-là sont
 * déjà dans l'accueil (la frise) et dans la barre de séance. Partagées par
 * un troisième morceau, Rolldown les sortait de l'accueil, et pour éviter un
 * cycle il en sortait aussi `createLucideIcon`, les composants du socle et
 * l'i18n : trois morceaux préchargés de plus, +1,0 kB gzip (ADR 0033).
 */
import {
  CirclePause,
  CirclePlay,
  Flag,
  Minus,
  Plus,
  Timer,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useWakeLock } from '@mister-guiiug/dev-pwa-config/react/use-wake-lock';
import { useI18n } from '../../i18n/index.ts';
import { END_SIGNAL, formatClock } from '../../app/clock.ts';
import { useNow } from '../../app/useNow.ts';
import { TEAMS, type Team } from '../board/model.ts';
import {
  clockLeft,
  EXCLUSION_MINUTES,
  exclusionLeft,
  HALVES,
  inProgress,
  isPaused,
  isTicking,
  MATCH_LIMITS,
  newMatch,
  timeoutLeft,
  type Match,
  type MatchEnd,
} from './model.ts';
import { useMatch } from './store.ts';
import { noteUsage } from '../../app/usage.ts';
// Avec l'écran, pas avec l'accueil.
import './match.css';

type T = ReturnType<typeof useI18n>['t'];

/** Quatre fois par seconde : un chiffre qui saute une seconde se voit. */
const PERIOD = 250;

const teamName = (t: T, team: Team) =>
  team === 'blanc' ? t('board.teamWhite') : t('board.teamBlack');

const halfName = (t: T, half: number) =>
  half === 1 ? t('match.half1') : t('match.half2');

function endText(t: T, end: MatchEnd): string {
  switch (end.kind) {
    case 'half':
      return end.half >= HALVES ? t('match.endMatch') : t('match.endFirstHalf');
    case 'break':
      return t('match.endBreak');
    case 'timeout':
      return t('match.endTimeout', { team: teamName(t, end.team) });
    case 'exclusion':
      return t('match.endExclusion', {
        number: end.number,
        team: teamName(t, end.team),
      });
  }
}

/**
 * DES MINUTES TAPÉES AU CLAVIER : le texte reste le temps de la saisie. Lié
 * directement au match, « 1 » en route vers « 15 » serait accepté, puis
 * « 150 » ramené à 45 sous le doigt.
 */
function MinutesField({
  label,
  value,
  limits,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number };
  onChange: (minutes: number) => void;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <TextField
      label={label}
      type="number"
      inputMode="numeric"
      min={limits.min}
      max={limits.max}
      value={typing ?? String(value)}
      onChange={event => {
        const raw = event.target.value;
        setTyping(raw);
        const minutes = Number(raw);
        if (
          raw !== '' &&
          Number.isInteger(minutes) &&
          minutes >= limits.min &&
          minutes <= limits.max
        ) {
          onChange(minutes);
        }
      }}
      onBlur={() => setTyping(null)}
    />
  );
}

/** Le grand chiffre, et ce qu'on fait du chrono. */
function MatchClock({ t, match, now }: { t: T; match: Match; now: number }) {
  const actions = useMatch.getState();
  const left = clockLeft(match, now);
  const time = formatClock(left);
  const paused = isPaused(match);

  const phase =
    match.phase === 'ready'
      ? t('match.ready')
      : match.phase === 'half'
        ? halfName(t, match.half)
        : match.phase === 'break'
          ? t('match.break')
          : t('match.over');

  const label =
    match.phase === 'break'
      ? left < 0
        ? t('match.clockBreakOver', { time: formatClock(-left) })
        : t('match.clockBreak', { time })
      : t('match.clockHalf', {
          half: halfName(t, match.half),
          time,
        });

  return (
    <section className="uwh-match__board" aria-label={t('match.clock')}>
      <p className="uwh-match__phase">
        <span>{phase}</span>
        {paused ? (
          <span className="uwh-match__paused">{t('match.paused')}</span>
        ) : null}
      </p>
      <p
        className="uwh-match__clock"
        role="timer"
        aria-label={label}
        data-state={
          paused || match.phase === 'ready'
            ? 'paused'
            : match.phase === 'break'
              ? 'break'
              : undefined
        }
      >
        {time}
      </p>
      <div className="uwh-match__controls">
        {match.phase === 'ready' ? (
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              noteUsage('matchStarted', { once: false });
              actions.start();
            }}
          >
            <CirclePlay size={20} aria-hidden="true" />
            {t('match.start')}
          </Button>
        ) : null}
        {match.phase === 'break' ? (
          <Button
            variant={left <= 0 ? 'primary' : 'secondary'}
            size="lg"
            block
            onClick={actions.start}
          >
            <CirclePlay size={20} aria-hidden="true" />
            {t('match.startSecond')}
          </Button>
        ) : null}
        {match.phase === 'half' ? (
          <>
            {/* Le libellé change avec l'état : « Pause », « Reprendre ». Un
                `aria-pressed` en plus dirait deux fois la même chose. */}
            <Button
              variant="primary"
              size="lg"
              onClick={paused ? actions.resume : actions.pause}
            >
              {paused ? (
                <CirclePlay size={20} aria-hidden="true" />
              ) : (
                <CirclePause size={20} aria-hidden="true" />
              )}
              {paused ? t('match.resume') : t('board.pause')}
            </Button>
            <Button variant="outline" size="lg" onClick={actions.endHalf}>
              <Flag size={20} aria-hidden="true" />
              {t('match.endHalf')}
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** Le temps mort en cours : sa minute, et la reprise du jeu. */
function TimeoutPanel({ t, match, now }: { t: T; match: Match; now: number }) {
  if (!match.timeout) return null;
  const team = teamName(t, match.timeout.team);
  const left = timeoutLeft(match, now);
  const time = formatClock(left);
  return (
    <section
      className="uwh-match__timeout"
      aria-label={t('match.timeoutOf', { team })}
    >
      <Timer size={22} aria-hidden="true" />
      <span className="uwh-match__timeout-text">
        <strong>{t('match.timeoutOf', { team })}</strong>
        {left <= 0 ? <span>{t('match.timeoutDone')}</span> : null}
      </span>
      <span
        className="uwh-match__count"
        role="timer"
        aria-label={t('match.timeoutLeft', { team, time })}
      >
        {time}
      </span>
      <Button
        variant={left <= 0 ? 'primary' : 'secondary'}
        onClick={useMatch.getState().resume}
      >
        <CirclePlay size={18} aria-hidden="true" />
        {t('match.resumePlay')}
      </Button>
    </section>
  );
}

/** Une équipe : son score, un but de plus ou de moins, son temps mort. */
function TeamCard({ t, match, team }: { t: T; match: Match; team: Team }) {
  const actions = useMatch.getState();
  const name = teamName(t, team);
  const id = useId();
  const taken = match.timeouts[team];
  return (
    <section className="uwh-match__team" data-team={team} aria-labelledby={id}>
      <h2 className="uwh-match__team-name" id={id}>
        <span className="uwh-match__cap" data-team={team} aria-hidden="true" />
        {name}
      </h2>
      <p className="uwh-match__goals">{match.score[team]}</p>
      <div className="uwh-match__goal-buttons">
        <Button
          variant="outline"
          size="lg"
          iconOnly
          aria-label={t('match.goalRemove', { team: name })}
          disabled={match.score[team] === 0}
          onClick={() => actions.goal(team, -1)}
        >
          <Minus size={22} aria-hidden="true" />
        </Button>
        <Button
          variant="primary"
          size="lg"
          iconOnly
          aria-label={t('match.goalAdd', { team: name })}
          onClick={() => actions.goal(team, 1)}
        >
          <Plus size={22} aria-hidden="true" />
        </Button>
      </div>
      <Button
        variant="secondary"
        block
        aria-label={t('match.timeoutOf', { team: name })}
        disabled={match.phase !== 'half' || match.timeout !== null}
        onClick={() => actions.timeout(team)}
      >
        <Timer size={18} aria-hidden="true" />
        {t('match.timeout')}
      </Button>
      <p className="uwh-muted m-0 text-supporting">
        {t('match.timeoutsTaken', { count: taken })}
      </p>
    </section>
  );
}

/** La feuille d'une exclusion : le numéro, l'équipe, la durée. */
function ExcludeSheet({ t, onClose }: { t: T; onClose: () => void }) {
  const formId = useId();
  const [number, setNumber] = useState('');
  const [team, setTeam] = useState<Team>('blanc');
  const [minutes, setMinutes] = useState<number>(EXCLUSION_MINUTES[0]);
  const value = Number(number);
  const valid =
    number !== '' &&
    Number.isInteger(value) &&
    value >= MATCH_LIMITS.number.min &&
    value <= MATCH_LIMITS.number.max;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    useMatch.getState().exclude({ team, number: value, minutes });
    onClose();
  };

  return (
    <Sheet
      open
      title={t('match.exclude')}
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          block
          disabled={!valid}
        >
          <UserX size={18} aria-hidden="true" />
          {t('match.excludeConfirm')}
        </Button>
      }
    >
      <form id={formId} className="uwh-stack" onSubmit={submit}>
        <TextField
          label={t('match.number')}
          type="number"
          inputMode="numeric"
          enterKeyHint="done"
          min={MATCH_LIMITS.number.min}
          max={MATCH_LIMITS.number.max}
          value={number}
          onChange={event => setNumber(event.target.value)}
        />
        <SegmentedControl
          ariaLabel={t('match.team')}
          value={team}
          onChange={value => setTeam(value as Team)}
          options={TEAMS.map(value => ({
            value,
            label: teamName(t, value),
          }))}
          fullWidth
        />
        <SegmentedControl
          ariaLabel={t('match.duration')}
          value={String(minutes)}
          onChange={value => setMinutes(Number(value))}
          options={EXCLUSION_MINUTES.map(n => ({
            value: String(n),
            label: t('seances.minutesShort', { n }),
          }))}
          fullWidth
        />
      </form>
    </Sheet>
  );
}

/** Les exclusions : chacune son compte à rebours, en temps de jeu. */
function Exclusions({ t, match, now }: { t: T; match: Match; now: number }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const remove = (index: number) => {
    const exclusion = match.exclusions[index];
    if (!exclusion) return;
    const actions = useMatch.getState();
    actions.unexclude(exclusion.id);
    const toastId = `match-exclusion-${exclusion.id}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('match.exclusionRemoved')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            useMatch.getState().restoreExclusion(exclusion, index);
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  return (
    <section className="uwh-stack uwh-stack--tight" aria-labelledby={titleId}>
      <div className="uwh-match__heading">
        <h2 className="uwh-subtitle" id={titleId}>
          {t('match.exclusions')}
        </h2>
        <Button
          variant="secondary"
          disabled={match.phase === 'over'}
          onClick={() => setOpen(true)}
        >
          <UserX size={18} aria-hidden="true" />
          {t('match.exclude')}
        </Button>
      </div>
      {match.exclusions.length === 0 ? (
        <p className="uwh-muted m-0 text-supporting">
          {t('match.noExclusion')}
        </p>
      ) : (
        <ul className="uwh-match__exclusions">
          {match.exclusions.map((exclusion, index) => {
            const team = teamName(t, exclusion.team);
            const left = exclusionLeft(match, exclusion, now);
            const time = formatClock(left);
            const done = left <= 0;
            return (
              <li
                key={exclusion.id}
                className="uwh-match__exclusion"
                data-done={done ? '' : undefined}
              >
                <span
                  className="uwh-match__number"
                  data-team={exclusion.team}
                  aria-hidden="true"
                >
                  {exclusion.number}
                </span>
                <span className="uwh-match__exclusion-text">
                  {t('match.exclusionOf', {
                    number: exclusion.number,
                    team,
                  })}
                  {done ? (
                    <span className="uwh-match__back">
                      {t('match.exclusionBack')}
                    </span>
                  ) : null}
                </span>
                <span
                  className="uwh-match__count"
                  role="timer"
                  aria-label={t('match.exclusionLeft', {
                    number: exclusion.number,
                    team,
                    time,
                  })}
                >
                  {time}
                </span>
                <Button
                  variant="ghost"
                  iconOnly
                  aria-label={t('match.exclusionRemove', {
                    number: exclusion.number,
                    team,
                  })}
                  onClick={() => remove(index)}
                >
                  <X size={20} aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="uwh-muted m-0 text-supporting">{t('match.playTime')}</p>
      {open ? <ExcludeSheet t={t} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}

/**
 * LE CHRONO DE MATCH (ADR 0033) : au bord du bassin, sur un téléphone. Le
 * temps qui reste, lisible de loin ; le score ; les temps morts ; les
 * exclusions, chacune son compte à rebours. L'écran reste allumé tant que le
 * match dure ; chaque fin vibre et se dit une fois.
 */
export function MatchScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const match = useMatch(s => s.match);
  const ends = useMatch(s => s.ends);
  const said = useMatch(s => s.said);
  const [now, refresh] = useNow(isTicking(match), PERIOD);

  useWakeLock(inProgress(match));

  // LA FIN D'UN MATCH SE COMPTE AU PASSAGE à « terminé », que ce soit le
  // sifflet ou le temps écoulé — pas en rouvrant l'écran d'un match fini.
  const [phaseSeen, setPhaseSeen] = useState(match.phase);
  if (phaseSeen !== match.phase) {
    setPhaseSeen(match.phase);
    if (match.phase === 'over') noteUsage('matchEnded', { once: false });
  }

  // L'heure se relit à chaque geste : sans quoi, à la reprise, le chiffre
  // serait calculé un quart de seconde sur l'heure de la pause.
  useEffect(
    () =>
      useMatch.subscribe((state, previous) => {
        if (state.match !== previous.match) refresh();
      }),
    [refresh]
  );

  // Chaque relevé met le match à l'heure ; au montage aussi, ce qui relève
  // une fin survenue écran fermé.
  useEffect(() => {
    useMatch.getState().tick();
  }, [now]);

  // Une fin vibre et se dit UNE fois : le magasin la passe de « à dire » à
  // « dite », et l'oublie quand l'écran se ferme.
  useEffect(() => {
    if (!ends || useMatch.getState().ends?.id !== ends.id) return;
    navigator.vibrate?.(END_SIGNAL);
    useMatch.getState().acknowledge(ends.id);
  }, [ends]);
  useEffect(() => () => useMatch.getState().forget(), []);

  /** Un nouveau match, qu'on peut annuler (ADR 0008). */
  const reset = () => {
    const before = useMatch.getState().match;
    useMatch.getState().replace(newMatch(before));
    const toastId = `match-nouveau-${Date.now()}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('match.resetDone')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            useMatch.getState().replace(before);
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  const settings = useMatch.getState().settings;

  return (
    <div className="uwh-stack uwh-match">
      <MatchClock t={t} match={match} now={now} />
      {/* Les durées se règlent avant le coup d'envoi, sous le chiffre
          qu'elles changent. */}
      {match.phase === 'ready' ? (
        <section
          className="uwh-match__settings"
          aria-label={t('match.settings')}
        >
          <MinutesField
            label={t('match.halfMinutes')}
            value={match.halfMinutes}
            limits={MATCH_LIMITS.halfMinutes}
            onChange={halfMinutes => settings({ halfMinutes })}
          />
          <MinutesField
            label={t('match.breakMinutes')}
            value={match.breakMinutes}
            limits={MATCH_LIMITS.breakMinutes}
            onChange={breakMinutes => settings({ breakMinutes })}
          />
        </section>
      ) : null}
      <TimeoutPanel t={t} match={match} now={now} />

      <div className="uwh-match__teams">
        {TEAMS.map(team => (
          <TeamCard key={team} t={t} match={match} team={team} />
        ))}
      </div>
      {/* Le score dit après chaque but, pour qui ne voit pas l'écran. */}
      <p className="sr-only" aria-live="polite">
        {t('match.scoreLine', {
          white: t('board.teamWhite'),
          whiteGoals: match.score.blanc,
          black: t('board.teamBlack'),
          blackGoals: match.score.noir,
        })}
      </p>

      <Exclusions t={t} match={match} now={now} />

      {match.phase === 'ready' ? null : (
        <div className="uwh-row">
          {/* DESTRUCTIF EN CONTOUR, comme « Vider cette équipe ». */}
          <Button variant="outline" className="uwh-danger" onClick={reset}>
            {t('match.newMatch')}
          </Button>
        </div>
      )}
      <p className="uwh-muted m-0 text-supporting">{t('match.deviceOnly')}</p>

      {/* Les fins, dites une fois quand elles tombent : le lecteur d'écran
          ne suit pas chaque seconde (`role="timer"` ne parle pas seul). */}
      <p className="sr-only" aria-live="assertive">
        {said?.list.map(end => endText(t, end)).join(' ')}
      </p>
    </div>
  );
}
