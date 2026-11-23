import { Layers } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { Popover } from '../../../ui/Popover.tsx';
import { boardStore, useBoard } from '../store.ts';
import { Switch } from './Switch.tsx';
import { noteUsage } from '../../../app/usage.ts';

interface Props {
  eco: boolean;
  onEco: (eco: boolean) => void;
}

/**
 * « CALQUES » : CE QU'ON DESSINE PAR-DESSUS LE JEU, posé sur le terrain
 * (ADR 0017). Ces réglages étaient dans l'onglet « Bassin », à côté des
 * dimensions de la piscine : ils ne disent rien du bassin, ils disent ce
 * qu'on veut voir — et c'est en regardant le terrain qu'on le décide.
 */
export function LayersPopover({ eco, onEco }: Props) {
  const { t } = useI18n();
  const display = useBoard(s => s.tactic.display);
  const actions = boardStore.getState();
  return (
    <Popover
      label={t('board.layers')}
      align="start"
      placement="below"
      className="uwh-layers"
      trigger={props => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={t('board.layers')}
          {...props}
        >
          <Layers size={16} aria-hidden="true" />
          <span className="uwh-layers__text">{t('board.layers')}</span>
        </Button>
      )}
    >
      {() => (
        <div className="uwh-stack uwh-stack--tight">
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
          {/* LA PHASE EN TRAITS (ADR 0036) : chaque nage, sur toute la phase. */}
          <Switch
            label={t('board.paths')}
            checked={display.paths === true}
            onChange={value => {
              if (value) noteUsage('allPaths');
              actions.setDisplay({ paths: value });
            }}
          />
          <Switch
            label={t('board.eco')}
            hint={t('board.ecoHint')}
            checked={eco}
            onChange={onEco}
          />
        </div>
      )}
    </Popover>
  );
}
