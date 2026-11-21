import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { useSaveState, worthKeeping } from './saveState.ts';
import { boardStore, useBoard } from './store.ts';

/**
 * REMPLACER LE BROUILLON SANS LE PERDRE (ADR 0008) : l'action part tout de
 * suite ; si le tableau portait un travail non enregistré, une notification
 * garde de quoi le remettre pendant huit secondes. Ouvrir un schéma de la
 * bibliothèque, un exemple, ou présenter une séance passent par là.
 */
export function useReplaceDraft() {
  const { t } = useI18n();
  const toast = useToast();
  // Le document entier, variantes comprises : c'est lui qu'on rendra.
  const draft = useBoard(s => s.doc);
  const saveState = useSaveState();

  return (action: () => void) => {
    const previous = draft;
    const keep = worthKeeping(saveState, previous);
    action();
    if (!keep) return;
    const toastId = `brouillon-remplace-${previous.id}-${previous.updatedAt}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('schemas.replaced')}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            boardStore.getState().load(previous);
          }}
        >
          {t('schemas.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };
}
