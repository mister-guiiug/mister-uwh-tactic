import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { seanceCodeFromHash } from './link.ts';
import type { Seance } from './model.ts';
import { presentGuest } from './play.ts';
import { noteUsage } from '../../app/usage.ts';

/**
 * UNE SÉANCE REÇUE PAR UN LIEN entre dans la bibliothèque avec ses schémas,
 * et son éditeur s'ouvre. Puis le lien quitte l'adresse : laissé là, il
 * ajouterait la même séance à chaque rechargement.
 *
 * LE LIEN POUR LES JOUEURS (ADR 0040) ne range rien : il ouvre le tableau
 * en présentation, sur la première phase, par la même demande qu'une séance
 * qu'on présente (`state.present`). En quittant la présentation, le joueur
 * trouve l'application telle qu'elle est.
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
    const name = (seance: Seance) => seance.name || t('seances.untitled');
    // UN SEUL `import()` : chacun emporte dans l'accueil la liste des
    // morceaux à précharger avec lui.
    import('./share.ts')
      .then(async ({ readSharedSeance, receiveSeance }) => {
        if (shared.player) {
          const received = await readSharedSeance(shared);
          if (!presentGuest(received)) throw new Error('rien à présenter');
          noteUsage('seancePlayerLinkOpened');
          toast.show(
            t('seances.playerOpened', { name: name(received.seance) }),
            { tone: 'success' }
          );
          void navigate('/', { state: { present: true } });
          return;
        }
        const seance = await receiveSeance(shared);
        toast.show(t('seances.sharedOpened', { name: name(seance) }), {
          tone: 'success',
        });
        void navigate(`/seances/${seance.id}`);
      })
      .catch(() => toast.show(t('seances.sharedInvalid'), { tone: 'error' }));
  }, [navigate, t, toast]);
}
