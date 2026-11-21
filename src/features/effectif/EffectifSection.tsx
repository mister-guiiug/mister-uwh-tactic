import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../i18n/index.ts';
import { useBoard } from '../board/store.ts';
import { applyChanges, keepChanges, keptFrom, namedCount } from './model.ts';
import { useEffectif } from './store.ts';
import { useApplyEffectif } from './useApplyEffectif.tsx';

/**
 * MON EFFECTIF DANS L'ONGLET ÉQUIPES (ADR 0028) : l'appliquer au schéma, ou
 * garder les prénoms du schéma comme effectif. Chaque bouton ne paraît que
 * s'il changerait quelque chose : un bouton qui ne fait rien se touche, et
 * l'on croit que l'application a raté.
 */
export function EffectifSection() {
  const { t, fmt, m } = useI18n();
  const toast = useToast();
  const tactic = useBoard(s => s.tactic);
  const effectif = useEffectif(s => s.effectif);
  const replace = useEffectif(s => s.replace);
  const apply = useApplyEffectif('equipes');
  const named = namedCount(effectif);
  const changes = useMemo(
    () => applyChanges(tactic, effectif),
    [tactic, effectif]
  );
  const keeps = useMemo(
    () => keepChanges(tactic, effectif),
    [tactic, effectif]
  );

  /*
   * GARDER, PUIS POUVOIR REVENIR (ADR 0008) : l'effectif n'est pas dans
   * l'historique du tableau, la notification garde donc l'effectif d'avant.
   */
  const keep = () => {
    const before = effectif;
    replace(keptFrom(tactic, before));
    trackEvent('effectif', { geste: 'garde' });
    const toastId = `effectif-garde-${Date.now()}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {fmt.plural(keeps, m.effectif.kept, { count: keeps })}
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
    <section className="uwh-stack uwh-stack--tight">
      <h3 className="uwh-subtitle">{t('effectif.title')}</h3>
      <p className="uwh-muted m-0 text-supporting">
        {named === 0
          ? t('effectif.empty')
          : changes === 0
            ? t('effectif.upToDate')
            : fmt.plural(named, m.effectif.summary, { count: named })}
      </p>
      {changes > 0 ? (
        <Button variant="outline" onClick={apply}>
          <Users size={18} aria-hidden="true" />
          {t('effectif.apply')}
        </Button>
      ) : null}
      {keeps > 0 ? (
        <>
          <Button variant="outline" onClick={keep}>
            {t('effectif.keep')}
          </Button>
          <p className="uwh-muted m-0 text-supporting">
            {t('effectif.keepHint')}
          </p>
        </>
      ) : null}
      <Link to="/effectif" className="uwh-link">
        {named === 0 ? t('effectif.fill') : t('effectif.edit')}
      </Link>
    </section>
  );
}
