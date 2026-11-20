import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { seanceCodeFromHash } from './link.ts';

/**
 * UNE SÉANCE REÇUE PAR UN LIEN entre dans la bibliothèque avec ses schémas,
 * et son éditeur s'ouvre. Puis le lien quitte l'adresse : laissé là, il
 * ajouterait la même séance à chaque rechargement.
 *
 * Le lien vise la racine de l'application, comme celui d'un schéma : c'est
 * la seule adresse que GitHub Pages sert sans passer par son repli 404. Ce
 * crochet vit donc dans la coquille, sur toutes les routes, et le décodeur
 * (`share.ts`) se charge à la demande — qui n'ouvre pas de lien ne le paie
 * pas.
 */
export function useSharedSeance(): void {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const shared = seanceCodeFromHash(window.location.hash);
    if (!shared) return;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
    import('./share.ts')
      .then(({ receiveSeance }) => receiveSeance(shared))
      .then(seance => {
        toast.show(
          t('seances.sharedOpened', {
            name: seance.name || t('seances.untitled'),
          }),
          { tone: 'success' }
        );
        void navigate(`/seances/${seance.id}`);
      })
      .catch(() => toast.show(t('seances.sharedInvalid'), { tone: 'error' }));
  }, [navigate, t, toast]);
}
