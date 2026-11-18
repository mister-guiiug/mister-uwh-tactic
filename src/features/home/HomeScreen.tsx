import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { BoardScreen } from '../board/BoardScreen.tsx';

/**
 * L'ACCUEIL, C'EST LE TABLEAU — suivi des deux éléments que la règle de la
 * famille veut sur l'accueil : la phrase qui dit ce que fait l'app, et le
 * pied de page (code source, soutien, signalement), sur l'accueil et À
 * propos, et nulle part ailleurs.
 *
 * LA PHRASE EST SOUS L'ESPACE DE TRAVAIL depuis la refonte (ADR 0016) : au-
 * dessus, elle repoussait le bassin hors du premier écran. Un moteur la lit
 * toujours — dans la page servie, où le socle pose la description, comme
 * dans celle que rend React.
 *
 * Le fichier garde le nom `HomeScreen` : c'est à lui que `pwa-doctor`
 * reconnaît l'accueil (`liens-famille`), comme dans tout le parc.
 */
export function HomeScreen() {
  const { t } = useI18n();
  return (
    <>
      <BoardScreen />
      <p className="mt-6 mb-0" style={{ color: 'var(--dwc-text-soft)' }}>
        {t('app.tagline')}
      </p>
      <AppFooter repoUrl={REPO_URL} issues className="mt-8" />
    </>
  );
}
