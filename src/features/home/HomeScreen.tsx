import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { BoardScreen } from '../board/BoardScreen.tsx';

/**
 * L'ACCUEIL, C'EST LE TABLEAU — encadré des deux éléments que la règle de la
 * famille veut sur l'accueil : la phrase qui dit ce que fait l'app, premier
 * texte que lit un visiteur et seul qu'un moteur associe à la page, et le pied
 * de page (code source, soutien, signalement), sur l'accueil et À propos, et
 * nulle part ailleurs.
 *
 * Le fichier garde le nom `HomeScreen` : c'est à lui que `pwa-doctor`
 * reconnaît l'accueil (`liens-famille`), comme dans tout le parc.
 */
export function HomeScreen() {
  const { t } = useI18n();
  return (
    <>
      <p className="mt-0 mb-4" style={{ color: 'var(--dwc-text-soft)' }}>
        {t('app.tagline')}
      </p>
      <BoardScreen />
      <AppFooter repoUrl={REPO_URL} issues className="mt-8" />
    </>
  );
}
