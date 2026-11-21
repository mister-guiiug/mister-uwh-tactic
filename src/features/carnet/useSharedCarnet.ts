import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { carnetCodeFromHash } from './link.ts';

/**
 * UN CARNET REÇU PAR UN LIEN (ADR 0023) entre dans la bibliothèque, et
 * l'écran Schémas s'ouvre sur ce qui vient d'arriver. Puis le lien quitte
 * l'adresse : laissé là, il ajouterait le même carnet à chaque rechargement.
 *
 * Comme celui d'une séance, le lien vise la racine de l'application — la
 * seule adresse que GitHub Pages sert sans son repli 404 : ce crochet vit
 * dans la coquille, et le décodeur se charge à la demande, avec le reste du
 * carnet (`parts.ts`). Il est précaché : ouvert sans réseau, le lien entre.
 */
export function useSharedCarnet(): void {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const shared = carnetCodeFromHash(window.location.hash);
    if (!shared) return;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
    import('./parts.ts')
      .then(({ receiveCarnet }) => receiveCarnet(shared))
      .then(carnet => void navigate('/schemas', { state: { carnet } }))
      .catch(() => toast.show(t('carnet.invalid'), { tone: 'error' }));
  }, [navigate, t, toast]);
}
