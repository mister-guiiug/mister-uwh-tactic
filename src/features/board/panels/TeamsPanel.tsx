import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { SelectField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import {
  FORMATIONS,
  formationSlots,
  type Formation,
  type LineRole,
  type SideRole,
} from '../formations.ts';
import { MAX_PLAYERS, MAX_SUBSTITUTES, type Team } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';
import { Switch } from '../workspace/Switch.tsx';
import { EffectifSection } from '../../effectif/EffectifSection.tsx';

const options = (max: number) =>
  Array.from({ length: max + 1 }, (_, n) => (
    <option key={n} value={n}>
      {n}
    </option>
  ));

/**
 * LES ÉQUIPES : combien dans l'eau, combien sur le banc, et une composition
 * à poser d'un geste — 3-2-1, 2-2-2, 1-2-1-2… — sur l'étape en cours, dans
 * la moitié de l'équipe. Le point de départ d'une phase, pas une vérité : on
 * déplace ensuite qui l'on veut.
 *
 * « Nommer les postes » renomme les six joueurs d'après leur place, avec
 * les sigles des clubs (« AG », « AC », « PD », « AR ») ; les noms valent pour tout le schéma, d'où la
 * bascule plutôt qu'un renommage d'office.
 */
export function TeamsPanel() {
  const { t } = useI18n();
  const toast = useToast();
  const pitch = useBoard(s => s.tactic.pitch);
  const counts = useBoard(s => s.tactic.counts);
  const actions = boardStore.getState();
  const [team, setTeam] = useState<Team>('blanc');
  const [formation, setFormation] = useState<Formation>('3-2-1');
  const [nameRoles, setNameRoles] = useState(false);

  const lineWord: Record<LineRole, string> = {
    front: t('board.roleFront'),
    middle: t('board.roleMiddle'),
    back: t('board.roleBack'),
  };
  const sideWord = (side: SideRole) =>
    side === 'left'
      ? t('board.sideLeft')
      : side === 'centre'
        ? t('board.sideCentre')
        : side === 'right'
          ? t('board.sideRight')
          : '';

  const apply = () => {
    const names = nameRoles
      ? Object.fromEntries(
          formationSlots(formation, team, pitch).map(slot => [
            slot.id,
            t('board.role', {
              line: lineWord[slot.line],
              side: sideWord(slot.side),
            }).trim(),
          ])
        )
      : undefined;
    actions.applyFormation(team, formation, names);
    toast.show(
      t('board.formationDone', {
        team: team === 'blanc' ? t('board.teamWhite') : t('board.teamBlack'),
        formation,
      }),
      { tone: 'success' }
    );
  };

  return (
    <div className="uwh-stack">
      {/* QUI JOUE, avant où il joue (ADR 0028). */}
      <EffectifSection />
      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.formation')}</h3>
        <p className="uwh-muted m-0 text-supporting">
          {t('board.formationHint')}
        </p>
        <SegmentedControl
          ariaLabel={t('board.formationTeam')}
          value={team}
          onChange={value => setTeam(value as Team)}
          options={[
            { value: 'blanc', label: t('board.teamWhite') },
            { value: 'noir', label: t('board.teamBlack') },
          ]}
          fullWidth
        />
        <SelectField
          label={t('board.formationPick')}
          value={formation}
          onChange={event => setFormation(event.target.value as Formation)}
        >
          {FORMATIONS.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </SelectField>
        <Switch
          label={t('board.formationNames')}
          checked={nameRoles}
          onChange={setNameRoles}
        />
        <Button variant="primary" onClick={apply}>
          {t('board.formationApply')}
        </Button>
      </section>

      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.squad')}</h3>
        <div className="uwh-grid-2">
          <SelectField
            label={t('board.whiteCount')}
            value={counts.blanc}
            onChange={event =>
              actions.setCount('blanc', Number(event.target.value))
            }
          >
            {options(MAX_PLAYERS)}
          </SelectField>
          <SelectField
            label={t('board.blackCount')}
            value={counts.noir}
            onChange={event =>
              actions.setCount('noir', Number(event.target.value))
            }
          >
            {options(MAX_PLAYERS)}
          </SelectField>
          <SelectField
            label={t('board.whiteSubs')}
            value={counts.substitutes.blanc}
            onChange={event =>
              actions.setSubstitutes('blanc', Number(event.target.value))
            }
          >
            {options(MAX_SUBSTITUTES)}
          </SelectField>
          <SelectField
            label={t('board.blackSubs')}
            value={counts.substitutes.noir}
            onChange={event =>
              actions.setSubstitutes('noir', Number(event.target.value))
            }
          >
            {options(MAX_SUBSTITUTES)}
          </SelectField>
        </div>
      </section>
    </div>
  );
}
