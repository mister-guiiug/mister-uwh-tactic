import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { PITCH_LIMITS } from '../model.ts';
import { boardStore, defaultPitchStore, useBoard } from '../store.ts';

/**
 * LE BASSIN : ses dimensions (le schéma suit, mis à l'échelle) et celui du
 * club. Ce qu'on dessine par-dessus le jeu est dans « Calques », sur le
 * terrain (ADR 0017).
 */
export function PoolPanel() {
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
        <p className="uwh-muted m-0 text-supporting">{t('board.poolHint')}</p>
        <p className="m-0 text-supporting" aria-live="polite">
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
    </div>
  );
}
