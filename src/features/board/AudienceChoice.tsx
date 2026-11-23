import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useI18n } from '../../i18n/index.ts';

/**
 * « POUR MODIFIER » OU « POUR LES JOUEURS » : ce qu'ouvre un lien (ADR 0035).
 * Écrit une fois : la feuille du QR code d'un schéma et la feuille de
 * partage d'une séance (ADR 0040) posent le même choix, avec les mêmes mots.
 */
export function AudienceChoice({
  label,
  players,
  onChange,
  className = '',
}: {
  /** Ce que le choix gouverne : « Le QR code ouvre », « Le lien ouvre ». */
  label: string;
  players: boolean;
  onChange: (players: boolean) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="text-supporting">{label}</span>
      <SegmentedControl
        value={players ? 'players' : 'edit'}
        ariaLabel={label}
        onChange={value => onChange(value === 'players')}
        options={[
          { value: 'edit', label: t('export.qrForEdit') },
          { value: 'players', label: t('export.qrForPlayers') },
        ]}
      />
    </div>
  );
}
