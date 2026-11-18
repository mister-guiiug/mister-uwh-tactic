import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { useI18n } from '../../../i18n/index.ts';

/**
 * LES PREMIERS PAS, une fois. Trois gestes que l'écran ne dit pas de
 * lui-même — glisser et pincer, « + » pour une étape, « ⋯ » pour partager —,
 * puis plus rien : un conseil qu'on voit à chaque ouverture finit par ne plus
 * être lu.
 *
 * En tête de l'onglet « Étape », celui qu'on voit en arrivant (ADR 0017) ;
 * il était dans l'inspecteur du jeton, qui ne s'ouvre plus qu'au choix d'un
 * joueur.
 */
export function FirstSteps() {
  const { t } = useI18n();
  const [welcomed, setWelcomed] = useLocalStorage(
    'mister-uwh-tactic:premiers-pas',
    false
  );
  if (welcomed) return null;
  return (
    <section className="uwh-tips" aria-labelledby="uwh-tips-title">
      <h3 id="uwh-tips-title" className="uwh-subtitle">
        {t('board.tipsTitle')}
      </h3>
      <ol className="uwh-tips__list">
        <li>{t('board.tip1')}</li>
        <li>{t('board.tip2')}</li>
        <li>{t('board.tip3')}</li>
      </ol>
      <Button variant="outline" onClick={() => setWelcomed(true)}>
        {t('board.tipsDone')}
      </Button>
    </section>
  );
}
