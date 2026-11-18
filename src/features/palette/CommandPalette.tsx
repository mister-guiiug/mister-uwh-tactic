import { lazy, Suspense, useEffect, useState } from 'react';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';

const loadDialog = () => import('./PaletteDialog.tsx');
const PaletteDialog = lazy(() =>
  loadDialog().then(module => ({ default: module.PaletteDialog }))
);

/**
 * LA PALETTE DE COMMANDES, Ctrl+K (⌘K sur Mac) : ce qu'on fait souvent, au
 * clavier, sans viser un bouton — aller à un écran, ajouter une étape,
 * placer une composition, ouvrir un schéma, une séance, un mot du lexique.
 * Prévue par l'audit n° 2 (gabarit « Canvas Editor » d'Astryx) pour le
 * bureau ; elle répond aussi à un clavier branché sur une tablette.
 *
 * Une boîte modale au motif « combobox » de l'ARIA : le focus reste dans le
 * champ, les flèches parcourent la liste, Entrée exécute, Échap referme et
 * rend le focus là où il était.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  // Le dialogue est dans son morceau (il tire les définitions du lexique) :
  // préchargé au repos, il est là au premier Ctrl+K.
  useIdlePrefetch(loadDialog);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return open ? (
    <Suspense fallback={null}>
      <PaletteDialog onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
}
