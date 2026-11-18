import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../../i18n/index.ts';
import { PITCH_LIMITS } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';
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
  const { t } = useI18n();
  const pitch = useBoard(s => s.tactic.pitch);
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
