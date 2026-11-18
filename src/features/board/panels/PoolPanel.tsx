import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { PITCH_LIMITS } from '../model.ts';
import { boardStore, defaultPitchStore, useBoard } from '../store.ts';
import { Switch } from '../workspace/Switch.tsx';

interface Props {
  eco: boolean;
  onEco: (eco: boolean) => void;
}

/**
 * LE BASSIN ET L'AFFICHAGE : les dimensions (le schéma suit, mis à
 * l'échelle), ce qu'on dessine par-dessus le jeu, et le mode économie de la
 * 3D — une préférence de l'appareil, pas du schéma.
 */
export function PoolPanel({ eco, onEco }: Props) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const pitch = useBoard(s => s.tactic.pitch);
  const [club, setClub] = useState(() => defaultPitchStore.load());
  const isClub =
    club.length === pitch.length &&
    club.width === pitch.width &&
    club.depth === pitch.depth;
  const metres = (value: number) =>
    fmt.number(value, { maximumFractionDigits: 2 });

  /** Le bassin du schéma devient celui de chaque schéma neuf. */
  const remember = () => {
    const kept = { ...pitch };
    defaultPitchStore.save(kept);
    setClub(kept);
    toast.show(t('board.poolRemembered'), { tone: 'success' });
  };
  const display = useBoard(s => s.tactic.display);
  const actions = boardStore.getState();

  const field = (key: 'length' | 'width' | 'depth', label: string) => (
    <TextField
      label={label}
      type="number"
      inputMode="decimal"
      min={PITCH_LIMITS[key].min}
      max={PITCH_LIMITS[key].max}
      step={key === 'depth' ? 0.05 : 0.5}
      value={pitch[key]}
      onChange={event => {
        const value = Number(event.target.value);
        if (Number.isFinite(value) && event.target.value !== '') {
          actions.setPitch({ [key]: value });
        }
      }}
    />
  );

  return (
    <div className="uwh-stack">
      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.pool')}</h3>
        <div className="uwh-grid-3">
          {field('length', t('board.length'))}
          {field('width', t('board.width'))}
          {field('depth', t('board.depthField'))}
        </div>
        <p className="uwh-muted m-0 text-sm">{t('board.poolHint')}</p>
        <p className="m-0 text-sm" aria-live="polite">
          {t('board.poolDefault', {
            length: metres(club.length),
            width: metres(club.width),
            depth: metres(club.depth),
          })}
        </p>
        <Button variant="outline" disabled={isClub} onClick={remember}>
          {t('board.poolRemember')}
        </Button>
      </section>
      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.display')}</h3>
        <Switch
          label={t('board.labels')}
          checked={display.labels}
          onChange={value => actions.setDisplay({ labels: value })}
        />
        <Switch
          label={t('board.ghosts')}
          checked={display.ghosts}
          onChange={value => actions.setDisplay({ ghosts: value })}
        />
        <Switch
          label={t('board.eco')}
          hint={t('board.ecoHint')}
          checked={eco}
          onChange={onEco}
        />
      </section>
    </div>
  );
}
