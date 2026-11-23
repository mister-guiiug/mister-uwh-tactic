import { useEffect, useRef } from 'react';
import { Link2, Printer } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../i18n/index.ts';
import type { Tactic } from '../board/model.ts';
import { arrange, type Sort } from '../schemas/arrange.ts';
import {
  coverage,
  pickedSchemas,
  toggleAll,
  type Picked,
} from '../schemas/selection.ts';
import type { CarnetArrival } from './link.ts';
import { CARNET_LIMITS } from './share.ts';
import { noteUsage } from '../../app/usage.ts';

/**
 * LA BARRE DE LA SÉLECTION (ADR 0023), collée au bas de l'écran pendant
 * qu'on parcourt la liste : « Tout », le compte, et l'envoi, sous le pouce.
 * « Tout » vaut pour ce que l'écran montre — la recherche comprise — et
 * paraît à demi coché quand une partie l'est.
 *
 * Le carnet part dans l'ordre de la liste, toute la bibliothèque comptée :
 * un schéma coché puis masqué par la recherche en est.
 */
export function PickBar({
  schemas,
  shownIds,
  sort,
  picked,
  onPick,
  onShare,
  onPrint,
}: {
  schemas: readonly Tactic[];
  shownIds: string[];
  sort: Sort;
  picked: Picked;
  onPick: (picked: Picked) => void;
  onShare: (schemas: Tactic[]) => void;
  /** Imprime la sélection en livret (ADR 0037). */
  onPrint?: (schemas: Tactic[]) => void;
}) {
  const { t, m, fmt, locale } = useI18n();
  const all = useRef<HTMLInputElement>(null);
  const state = coverage(picked, shownIds);
  const chosen = pickedSchemas(arrange(schemas, '', sort, locale), picked);
  const count = chosen.length;
  const tooMany = count > CARNET_LIMITS.schemas;
  useEffect(() => {
    if (all.current) all.current.indeterminate = state === 'some';
  }, [state]);

  return (
    <div className="uwh-pickbar">
      <label className="uwh-pickbar__all">
        <span className="uwh-check">
          <input
            ref={all}
            type="checkbox"
            checked={state === 'all'}
            disabled={shownIds.length === 0}
            onChange={() => onPick(toggleAll(picked, shownIds))}
          />
        </span>
        {t('carnet.all')}
      </label>
      <p className="uwh-pickbar__count m-0 text-supporting" aria-live="polite">
        {fmt.plural(count, m.carnet.count, { count })}
        {tooMany
          ? ` ${t('carnet.tooMany', { max: CARNET_LIMITS.schemas })}`
          : null}
      </p>
      <Button
        variant="primary"
        disabled={count === 0 || tooMany}
        onClick={() => onShare(chosen)}
      >
        <Link2 size={18} aria-hidden="true" />
        {t('carnet.share')}
      </Button>
      {onPrint ? (
        <Button
          variant="outline"
          disabled={count === 0}
          onClick={() => {
            noteUsage('printCarnet');
            onPrint(chosen);
          }}
        >
          <Printer size={18} aria-hidden="true" />
          {t('carnet.print')}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * CE QUI VIENT D'ARRIVER (ADR 0023) : le carnet ouvert depuis la messagerie
 * est rangé, et l'écran le dit — combien, sous quel nom, et qu'il se relira
 * sans réseau. Les vignettes reçues portent « Reçu ».
 */
export function ArrivalNotice({
  arrival,
  onDismiss,
}: {
  arrival: CarnetArrival;
  onDismiss: () => void;
}) {
  const { t, m, fmt } = useI18n();
  const count = arrival.ids.length;
  return (
    <div className="uwh-arrival" role="status">
      <p className="m-0">
        {fmt.plural(count, m.carnet.arrived, {
          count,
          name: arrival.name || t('carnet.untitled'),
        })}
      </p>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        {t('carnet.dismiss')}
      </Button>
    </div>
  );
}
