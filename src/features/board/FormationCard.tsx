import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { SelectField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import {
  FORMATIONS,
  formationSlots,
  type Formation,
  type LineRole,
  type SideRole,
} from './formations.ts';
import type { Team } from './model.ts';
import { boardStore, useBoard } from './store.ts';

/**
 * PLACER UNE ÉQUIPE EN COMPOSITION — 3-2-1, 2-2-2, 1-2-1-2… — sur l'étape en
 * cours, dans sa moitié. Le point de départ d'une phase, pas une vérité : on
 * déplace ensuite qui l'on veut.
 *
 * « Nommer les postes » renomme les six joueurs d'après leur place (« Av G »,
 * « Pivot D », « Ar ») ; les noms valent pour tout le schéma, d'où la case à
 * cocher plutôt qu'un renommage d'office.
 */
export function FormationCard() {
  const { t } = useI18n();
  const toast = useToast();
  const pitch = useBoard(s => s.tactic.pitch);
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
    boardStore.getState().applyFormation(team, formation, names);
    toast.show(
      t('board.formationDone', {
        team: team === 'blanc' ? t('board.teamWhite') : t('board.teamBlack'),
        formation,
      }),
      { tone: 'success' }
    );
  };

  return (
    <Card className="mt-3 flex flex-col gap-3">
      <CardHeader
        title={t('board.formation')}
        subtitle={t('board.formationHint')}
      />
      <div className="flex flex-wrap items-end gap-3">
        <SegmentedControl
          ariaLabel={t('board.formationTeam')}
          value={team}
          onChange={value => setTeam(value as Team)}
          options={[
            { value: 'blanc', label: t('board.teamWhite') },
            { value: 'noir', label: t('board.teamBlack') },
          ]}
        />
        <SelectField
          label={t('board.formationPick')}
          value={formation}
          onChange={event => setFormation(event.target.value as Formation)}
          className="min-w-40"
        >
          {FORMATIONS.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </SelectField>
        <Button variant="outline" onClick={apply}>
          {t('board.formationApply')}
        </Button>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={nameRoles}
          onChange={event => setNameRoles(event.target.checked)}
        />
        {t('board.formationNames')}
      </label>
    </Card>
  );
}
