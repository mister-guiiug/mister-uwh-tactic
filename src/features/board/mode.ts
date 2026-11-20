import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';

/**
 * LE MODE SIMPLE ET LE MODE COMPLET (ADR 0020).
 *
 * Les premiers retours au téléphone : « difficile à utiliser ». Relevé du
 * 20/11/2026 sur un Pixel 7 : 54 contrôles dès l'arrivée, dont 35 jetons de
 * 20 px, quatre outils au sens trompeur, cinq onglets. Le mode simple montre
 * moins — des pions, des gestes, une frise courte, aucun onglet — SANS RIEN
 * EFFACER : un schéma fait en mode complet s'ouvre en mode simple intact.
 *
 * Retenu par appareil. Tant qu'il n'est pas choisi, le téléphone part en
 * simple et le grand écran en complet ; le premier lancement propose le
 * choix.
 */
export type UiMode = 'simple' | 'advanced';

const KEY = 'mister-uwh-tactic:mode';

export function useUiMode(): {
  mode: UiMode;
  chosen: boolean;
  choose: (mode: UiMode, origin: string) => void;
} {
  const [stored, setStored] = useLocalStorage<UiMode | null>(KEY, null);
  const phone = useMediaQuery('(max-width: 47.99rem)');
  const mode: UiMode = stored ?? (phone ? 'simple' : 'advanced');
  return {
    mode,
    chosen: stored !== null,
    choose: (next, origin) => {
      setStored(next);
      // LA MESURE DIT SI LE MODE SIMPLE RÈGLE LE PROBLÈME : quel mode, choisi
      // d'où. Rien de personnel ; rien ne part sans consentement.
      trackEvent('mode_choisi', { mode: next, origine: origin });
    },
  };
}
