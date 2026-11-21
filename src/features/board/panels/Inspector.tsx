import { useMemo, useState } from 'react';
import {
  CircleDot,
  CopyCheck,
  MoveRight,
  RotateCcw,
  RotateCw,
  Waves,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import {
  SelectField,
  TextField,
} from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { MOVE_MIN } from '../curve.ts';
import { frameAt } from '../frame.ts';
import { playerTitle, refereeTitle } from '../labels.ts';
import {
  DECK_REFEREE_NUMBER,
  distance,
  isSubstitute,
  PUCK_ID,
  visiblePlayers,
} from '../model.ts';
import { boardStore, useBoard } from '../store.ts';
import { Switch } from '../workspace/Switch.tsx';

/** Le champ de nom, que le double-clic sur un jeton vient chercher. */
import { INSPECTOR_NAME_ID } from '../workspace/panelTabs.ts';

/**
 * L'INSPECTEUR : tout ce qu'on peut faire au jeton sélectionné, au même
 * endroit. Il remplace deux surfaces d'avant la refonte — la barre de
 * sélection sous le tableau (tourner, plonger) et la fiche modale du jeton
 * (nom, main, remplacement, orientation), qu'il fallait ouvrir par un
 * double-clic que personne ne devine.
 *
 * Le nom et la main valent pour tout le schéma ; la profondeur et
 * l'orientation pour l'étape courante seulement — l'inspecteur le dit, sinon
 * on croirait avoir changé un joueur pour toute la phase.
 */
export function Inspector() {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const playhead = useBoard(s => s.playhead);
  const playing = useBoard(s => s.playing);
  const selected = useBoard(s => s.selected);
  const extra = useBoard(s => s.extra);
  const actions = boardStore.getState();
  const followed = useBoard(s => s.followed);
  const [incoming, setIncoming] = useState('');
  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);

  if (playing) {
    return <p className="uwh-muted m-0">{t('board.playingLocked')}</p>;
  }

  /*
   * GARDER CETTE POSITION AUX ÉTAPES SUIVANTES. Une étape naît copie de la
   * précédente ; replacer un joueur à l'étape 2 d'une phase de six laissait
   * les étapes 3 à 6 sur l'ancienne position, à reprendre une à une.
   */
  const later = tactic.steps.length - 1 - step;
  const carry = (group: boolean) => (
    <Button
      variant="outline"
      disabled={later === 0}
      onClick={() => {
        actions.carryForward();
        toast.show(fmt.plural(later, m.board.carried, { count: later }), {
          tone: 'success',
        });
      }}
    >
      <CopyCheck size={18} aria-hidden="true" />
      {group ? t('board.carryForwardGroup') : t('board.carryForward')}
    </Button>
  );

  const groupCount = selected ? 1 + extra.length : 0;
  if (groupCount > 1) {
    return (
      <div className="uwh-stack">
        <p className="m-0 font-semibold" aria-live="polite">
          {t('board.groupSelected', { count: groupCount })}
        </p>
        <div className="uwh-row">
          <Button
            variant="outline"
            iconOnly
            aria-label={t('board.rotateGroupLeft')}
            onClick={() => actions.rotateSelection(-15)}
          >
            <RotateCcw size={20} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            iconOnly
            aria-label={t('board.rotateGroupRight')}
            onClick={() => actions.rotateSelection(15)}
          >
            <RotateCw size={20} aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={() => actions.select(null)}>
            {t('board.deselect')}
          </Button>
        </div>
        {carry(true)}
      </div>
    );
  }

  if (selected === PUCK_ID) {
    return (
      <div className="uwh-stack">
        <p className="m-0 font-semibold" aria-live="polite">
          {t('board.puckSelected')}
        </p>
        {carry(false)}
      </div>
    );
  }

  const player = tactic.roster.players.find(p => p.id === selected);
  const referee = tactic.roster.referees.find(r => r.id === selected);
  const pose = selected ? tactic.steps[step]?.poses[selected] : undefined;
  const framed =
    frame.players.find(p => p.id === selected) ??
    frame.referees.find(r => r.id === selected);

  if (!selected || !pose || !framed || (!player && !referee)) {
    return (
      <div className="uwh-stack">
        <p className="m-0">{t('board.selectionNone')}</p>
        <p className="uwh-muted m-0 text-supporting">{t('board.hint')}</p>
        <div className="uwh-row">
          <Button variant="outline" onClick={() => actions.selectTeam('blanc')}>
            {t('board.selectWhite')}
          </Button>
          <Button variant="outline" onClick={() => actions.selectTeam('noir')}>
            {t('board.selectBlack')}
          </Button>
        </div>
        <details className="uwh-details uwh-keys">
          <summary>{t('board.keyboard')}</summary>
          <p className="uwh-muted m-0 text-supporting">{t('board.help')}</p>
          <p className="uwh-muted m-0 mt-2 text-supporting">
            {t('board.shortcuts')}
          </p>
        </details>
      </div>
    );
  }

  const id = selected;
  const title = player
    ? [
        playerTitle(t, player),
        isSubstitute(player) ? t('board.substitute') : '',
      ]
        .filter(Boolean)
        .join(', ')
    : refereeTitle(t, {
        deck: referee!.number === DECK_REFEREE_NUMBER,
        number: referee!.number,
      });
  const surface = pose.surface !== false;
  const carries = tactic.steps[step]?.carrier === id;
  const curve = player ? tactic.steps[step]?.curves?.[id] : undefined;
  const previous = step > 0 ? tactic.steps[step - 1]?.poses[id] : undefined;
  const swims = Boolean(
    player && previous && distance(previous, pose) > MOVE_MIN
  );
  const bench = player
    ? visiblePlayers(tactic).filter(
        p => p.team === player.team && isSubstitute(p)
      )
    : [];
  const chosen = bench.some(p => p.id === incoming)
    ? incoming
    : (bench[0]?.id ?? '');

  return (
    <div className="uwh-stack">
      <div className="uwh-row uwh-row--between">
        <div className="min-w-0">
          <p className="m-0 font-semibold" aria-live="polite">
            {title}
          </p>
          {player ? (
            <p className="uwh-muted m-0 text-supporting">
              {surface ? t('board.surface') : t('board.underwater')}
            </p>
          ) : null}
        </div>
        <div className="uwh-row">
          <Button
            variant="outline"
            iconOnly
            aria-label={t('board.rotateLeft')}
            onClick={() => actions.rotate(id, framed.angle - 15)}
          >
            <RotateCcw size={20} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            iconOnly
            aria-label={t('board.rotateRight')}
            onClick={() => actions.rotate(id, framed.angle + 15)}
          >
            <RotateCw size={20} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {carry(false)}

      {/* SUIVRE SA NAGE (ADR 0036) : tout le chemin du joueur sur la phase,
          les autres estompés. */}
      {player ? (
        <Button
          variant="outline"
          aria-pressed={followed === id}
          onClick={() => actions.setFollowed(followed === id ? null : id)}
        >
          {followed === id ? t('follow.stop') : t('follow.start')}
        </Button>
      ) : null}

      {player ? (
        <div className="uwh-field">
          <span className="uwh-field__label">
            {t('board.depth', { step: step + 1 })}
          </span>
          <SegmentedControl
            ariaLabel={t('board.depth', { step: step + 1 })}
            value={surface ? 'surface' : 'fond'}
            onChange={value => actions.setSurface(id, value === 'surface')}
            options={[
              {
                value: 'surface',
                label: (
                  <span className="uwh-seg">
                    <Waves size={16} aria-hidden="true" />
                    {t('board.depthSurface')}
                  </span>
                ),
              },
              { value: 'fond', label: t('board.depthBottom') },
            ]}
            fullWidth
          />
        </div>
      ) : null}

      {/* LE PALET EST AU FOND, ET SON PORTEUR AUSSI : le lui donner le fait
          descendre ; s'il remonte, il le lâche (`carry.ts`). */}
      {player && !isSubstitute(player) ? (
        <div className="uwh-stack uwh-stack--tight">
          <div className="uwh-row">
            <Button
              variant="outline"
              aria-pressed={carries}
              onClick={() => actions.setCarrier(carries ? null : id)}
            >
              <CircleDot size={18} aria-hidden="true" />
              {carries ? t('board.dropPuck') : t('board.givePuck')}
            </Button>
          </div>
          {carries ? (
            <p className="uwh-muted m-0 text-supporting">
              {t('board.carrying')}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* LA NAGE COURBE depuis l'étape précédente (`curve.ts`) : la poignée
          la courbe sur le tableau, ce bouton la redresse. */}
      {curve ? (
        <div className="uwh-stack uwh-stack--tight">
          <p className="uwh-muted m-0 text-supporting">
            {t('curve.curved', { step })}
          </p>
          <div className="uwh-row">
            <Button
              variant="outline"
              onClick={() => actions.setCurve(id, null)}
            >
              <MoveRight size={18} aria-hidden="true" />
              {t('curve.straighten')}
            </Button>
          </div>
        </div>
      ) : swims && tactic.display.ghosts ? (
        <p className="uwh-muted m-0 text-supporting">{t('curve.hint')}</p>
      ) : null}

      <TextField
        id={INSPECTOR_NAME_ID}
        label={t('board.name')}
        hint={t('board.nameHint')}
        value={(player ?? referee)?.name ?? ''}
        maxLength={24}
        onChange={event => actions.rename(id, event.target.value)}
      />

      {player ? (
        <Switch
          label={t('board.leftHandedSwitch')}
          checked={player.leftHanded}
          onChange={value => actions.setLeftHanded(id, value)}
        />
      ) : null}

      {/* SON APNÉE : tous ne tiennent pas autant (`apnea.ts`). */}
      {player && !isSubstitute(player) ? (
        <TextField
          label={t('board.playerApnea')}
          hint={t('board.playerApneaHint', {
            seconds: tactic.display.apneaLimit,
          })}
          type="number"
          inputMode="numeric"
          min={5}
          max={60}
          placeholder={String(tactic.display.apneaLimit)}
          value={player.apnea ?? ''}
          onChange={event => {
            const raw = event.target.value;
            if (raw === '') return actions.setApnea(id, null);
            const value = Number(raw);
            if (Number.isFinite(value) && value >= 5 && value <= 60) {
              actions.setApnea(id, value);
            }
          }}
          className="w-36"
        />
      ) : null}

      {/* LE REMPLACEMENT : un remplaçant affiché de la même équipe prend la
          place de ce joueur, qui part dans la zone. */}
      {player && !isSubstitute(player) ? (
        bench.length === 0 ? (
          <p className="uwh-muted m-0 text-supporting">
            {t('board.substituteNone')}
          </p>
        ) : (
          <div className="uwh-row uwh-row--end">
            <SelectField
              label={t('board.substituteWith')}
              value={chosen}
              onChange={event => setIncoming(event.target.value)}
              className="min-w-40 flex-1"
            >
              {bench.map(p => (
                <option key={p.id} value={p.id}>
                  {playerTitle(t, p)}
                  {p.name ? ` · ${p.name}` : ''}
                </option>
              ))}
            </SelectField>
            <Button
              variant="outline"
              onClick={() => actions.substitute(player.id, chosen)}
            >
              {t('board.substituteDo')}
            </Button>
          </div>
        )
      ) : null}

      <label className="uwh-field">
        <span className="uwh-field__label">
          {t('board.heading', {
            angle: Math.round(pose.angle),
            step: step + 1,
          })}
        </span>
        <input
          type="range"
          className="uwh-range"
          min={0}
          max={355}
          step={5}
          value={(((Math.round(pose.angle / 5) * 5) % 360) + 360) % 360}
          onChange={event => actions.rotate(id, Number(event.target.value))}
        />
      </label>
    </div>
  );
}
