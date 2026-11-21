import { useId, useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { playerTitle } from '../board/labels.ts';
import { MAX_PLAYERS, SQUAD_SIZE, type Team } from '../board/model.ts';
import { Switch } from '../board/workspace/Switch.tsx';
import {
  emptyEffectif,
  isNamed,
  MEMBER_NAME_MAX,
  namedCount,
  type Member,
} from './model.ts';
import { useEffectif, type MemberPatch } from './store.ts';

type T = ReturnType<typeof useI18n>['t'];

/**
 * SON APNÉE, saisie au clavier : le texte tapé reste le temps de la saisie.
 * Lié directement à l'effectif, « 1 » — en route vers « 12 » — serait hors
 * des bornes, refusé, et le champ se viderait sous le doigt.
 */
function ApneaField({
  value,
  label,
  onChange,
}: {
  value: number | undefined;
  label: string;
  onChange: (seconds: number | null) => void;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <TextField
      className="uwh-effectif__apnea"
      label={label}
      type="number"
      inputMode="numeric"
      min={5}
      max={60}
      value={typing ?? (value === undefined ? '' : String(value))}
      onChange={event => {
        const raw = event.target.value;
        setTyping(raw);
        if (raw === '') return onChange(null);
        const seconds = Number(raw);
        if (Number.isFinite(seconds) && seconds >= 5 && seconds <= 60) {
          onChange(seconds);
        }
      }}
      onBlur={() => setTyping(null)}
    />
  );
}

/**
 * UN NUMÉRO DE L'EFFECTIF : sa pastille, son prénom ; une fois nommé, sa
 * main et, dans l'eau, son apnée. Un numéro sans prénom n'est pas dans
 * l'effectif : lui demander sa main n'aurait pas de sens.
 */
function MemberRow({
  t,
  team,
  number,
  member,
  onChange,
}: {
  t: T;
  team: Team;
  number: number;
  member: Member;
  onChange: (patch: MemberPatch) => void;
}) {
  const id = useId();
  return (
    <li>
      <div role="group" aria-labelledby={id} className="uwh-effectif__member">
        <span
          className="uwh-effectif__number"
          data-team={team}
          aria-hidden="true"
        >
          {number}
        </span>
        <span id={id} className="sr-only">
          {playerTitle(t, { team, number })}
        </span>
        <TextField
          className="uwh-effectif__name"
          label={t('effectif.name')}
          placeholder={t('effectif.name')}
          value={member.name}
          maxLength={MEMBER_NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          onChange={event => onChange({ name: event.target.value })}
        />
        {isNamed(member) ? (
          <div className="uwh-effectif__more">
            <Switch
              label={t('effectif.leftHanded')}
              checked={member.leftHanded}
              onChange={leftHanded => onChange({ leftHanded })}
            />
            {number <= MAX_PLAYERS ? (
              <ApneaField
                label={t('effectif.apnea')}
                value={member.apnea}
                onChange={apnea => onChange({ apnea })}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * MON EFFECTIF (ADR 0028) : une liste au doigt, un numéro par ligne, les
 * six de l'eau puis les quatre remplaçants. Rien à enregistrer : chaque
 * lettre est gardée sur l'appareil à mesure qu'on la tape.
 */
export function EffectifScreen() {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const effectif = useEffectif(s => s.effectif);
  const setMember = useEffectif(s => s.setMember);
  const replace = useEffectif(s => s.replace);
  const [team, setTeam] = useState<Team>('blanc');
  const fieldId = useId();
  const benchId = useId();
  const count = namedCount(effectif, team);

  const numbers = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const row = (number: number) => (
    <MemberRow
      key={`${team}-${number}`}
      t={t}
      team={team}
      number={number}
      member={effectif[team][number - 1]!}
      onChange={patch => setMember(team, number, patch)}
    />
  );

  /** Vider, puis pouvoir revenir (ADR 0008). */
  const clear = () => {
    const before = effectif;
    replace({ ...before, [team]: emptyEffectif()[team] });
    const toastId = `effectif-vide-${team}-${Date.now()}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('effectif.cleared')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            replace(before);
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };

  return (
    <div className="uwh-stack">
      <p className="m-0">{t('effectif.intro')}</p>
      <SegmentedControl
        ariaLabel={t('effectif.team')}
        value={team}
        onChange={value => setTeam(value as Team)}
        options={[
          { value: 'blanc', label: t('board.teamWhite') },
          { value: 'noir', label: t('board.teamBlack') },
        ]}
        fullWidth
      />
      <p className="uwh-muted m-0 text-supporting" aria-live="polite">
        {count === 0
          ? t('effectif.none')
          : fmt.plural(count, m.effectif.count, { count })}
      </p>

      <section className="uwh-stack uwh-stack--tight" aria-labelledby={fieldId}>
        <h2 className="uwh-subtitle" id={fieldId}>
          {t('effectif.field')}
        </h2>
        <ol className="uwh-effectif">{numbers(1, MAX_PLAYERS).map(row)}</ol>
        <p className="uwh-muted m-0 text-supporting">
          {t('effectif.apneaHint')}
        </p>
      </section>

      <section className="uwh-stack uwh-stack--tight" aria-labelledby={benchId}>
        <h2 className="uwh-subtitle" id={benchId}>
          {t('effectif.bench')}
        </h2>
        <ol className="uwh-effectif" start={MAX_PLAYERS + 1}>
          {numbers(MAX_PLAYERS + 1, SQUAD_SIZE).map(row)}
        </ol>
      </section>

      <p className="uwh-muted m-0 text-supporting">
        {t('effectif.deviceOnly')}
      </p>
      <div className="uwh-row">
        {/* DESTRUCTIF EN CONTOUR, comme « Effacer mes notes » : un rouge
            plein pèserait autant qu'un primaire. */}
        <Button
          variant="outline"
          className="uwh-danger"
          disabled={count === 0}
          onClick={clear}
        >
          {t('effectif.clear')}
        </Button>
      </div>
    </div>
  );
}
