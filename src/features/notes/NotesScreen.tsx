import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { notesCache, notesSync } from '../../backend/index.ts';
import { useNotes } from './store.ts';
import { SyncState } from './SyncState.tsx';
import { StaleCopy } from './StaleCopy.tsx';

/** L'identifiant de la notification d'une note : un sursis, une notification. */
const undoToastId = (id: string) => `note-supprimee-${id}`;

/**
 * LES NOTES DU COACH : consignes, retours de séance, ce qu'on veut dire au
 * prochain entraînement. C'est l'écran d'exemple du squelette, gardé tel quel
 * parce qu'il apporte ce que le tableau n'a pas encore : la persistance
 * derrière un port avec sa variante Supabase, la file hors ligne, et une
 * suppression qu'on peut ANNULER.
 *
 * L'accroche et le pied de page de la famille sont partis avec l'accueil :
 * la règle du 06/09/2026 les veut sur l'accueil et sur À propos, et nulle
 * part ailleurs.
 */
export function NotesScreen() {
  const { t, m, fmt } = useI18n();
  // Un SÉLECTEUR PAR CHAMP, jamais un objet construit dans le sélecteur : un
  // objet neuf à chaque rendu fait boucler `useSyncExternalStore` et rend une
  // page blanche. C'est un piège déjà rencontré dans le parc.
  const notes = useNotes(state => state.notes);
  const ready = useNotes(state => state.ready);
  const error = useNotes(state => state.error);
  const load = useNotes(state => state.load);
  const add = useNotes(state => state.add);
  const remove = useNotes(state => state.remove);
  const undoRemove = useNotes(state => state.undoRemove);
  const flushRemovals = useNotes(state => state.flushRemovals);
  const pending = useNotes(state => state.pending);
  const [draft, setDraft] = useState('');
  const toast = useToast();
  /** La note dont la notification est affichée, pour savoir laquelle fermer. */
  const affichee = useRef<string | null>(null);

  // La première lecture passe par le port : instantanée en local, requête
  // réseau une fois le backend distant configuré. L'écran ne sait pas lequel,
  // et c'est le but.
  useEffect(() => {
    void load();
  }, [load]);

  /**
   * LE MAGASIN TIENT LA MINUTERIE, LA NOTIFICATION NE FAIT QU'AFFICHER.
   *
   * Elle est donc posée en `duration: 0` — permanente — et fermée ici, quand
   * le sursis s'achève : annulé, soldé, ou remplacé par un autre. Deux
   * minuteries indépendantes se désynchroniseraient au premier survol, car le
   * socle suspend la sienne (WCAG 2.2.1) et pas celle du magasin : « Annuler »
   * resterait affiché, cliquable, et sans effet.
   */
  useEffect(() => {
    const encours = pending?.note.id ?? null;
    if (affichee.current && affichee.current !== encours) {
      toast.dismiss(undoToastId(affichee.current));
    }
    affichee.current = encours;
  }, [pending, toast]);

  /**
   * QUITTER L'ÉCRAN SOLDE LE SURSIS. Sans cette ligne, changer d'onglet
   * pendant les huit secondes emporterait la minuterie avec le composant :
   * l'écran aurait perdu la note, la base l'aurait gardée, et elle
   * réapparaîtrait au prochain chargement sans explication.
   */
  useEffect(
    () => () => {
      if (affichee.current) toast.dismiss(undoToastId(affichee.current));
      void flushRemovals();
    },
    [flushRemovals, toast]
  );

  const supprimer = (id: string) => {
    remove(id);
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {t('notes.removed')}
        <Button variant="ghost" size="sm" onClick={() => undoRemove(id)}>
          {t('notes.undo')}
        </Button>
      </span>,
      { id: undoToastId(id), duration: 0 }
    );
  };

  // Formulaire NON CONTRÔLÉ pour la soumission, contrôlé pour le champ : la
  // soumission passe par `onSubmit` afin que « Entrée » fonctionne au clavier,
  // pas seulement le clic sur le bouton.
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void add(draft);
    setDraft('');
  };

  return (
    <>
      <form onSubmit={submit} className="flex items-end gap-2">
        <TextField
          label={t('notes.field')}
          placeholder={t('notes.placeholder')}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          {t('notes.add')}
        </Button>
      </form>

      {/* L'erreur d'écriture est PORTÉE À L'ÉCRAN, pas seulement journalisée :
          l'état a déjà été restauré, et sans ce bandeau la note disparaîtrait
          sans explication. */}
      {error ? <ErrorBanner message={error} className="mt-4" /> : null}

      {/* L'ÉTAT DE LA FILE, quand il y a un réseau à traverser. En local il
          n'y en a pas : `notesSync` est `null` et rien n'est rendu — un
          indicateur qui dirait « à jour » sans jamais rien attendre serait du
          décor. Le rendu conditionnel est ICI, pas dans le composant : un
          crochet ne s'appelle pas sous condition. */}
      {notesSync ? (
        <div className="mt-4">
          <SyncState sync={notesSync} onResync={() => void load()} />
        </div>
      ) : null}

      {/* LA COPIE DATÉE, même règle : il n'y en a qu'en mode distant. Hors
          ligne, la liste vient du dernier état que le serveur a confirmé — et
          l'écran le dit, avec sa date (ADR 0013). */}
      {notesCache ? (
        <StaleCopy cache={notesCache} onRetry={load} className="mt-4" />
      ) : null}

      {!ready ? (
        // `label` est OBLIGATOIRE : un squelette sans nom accessible est une
        // zone que rien n'annonce à un lecteur d'écran.
        <SkeletonGroup label={t('notes.loading')} lines={3} className="mt-6" />
      ) : notes.length === 0 ? (
        <EmptyState
          title={t('notes.empty')}
          description={t('notes.emptyHint')}
          className="mt-8"
        />
      ) : (
        <>
          <p
            className="mt-6 text-supporting"
            style={{ color: 'var(--dwc-text-soft)' }}
          >
            {/* `fmt.plural` suit la locale courante : ni « 1 notes », ni un
                accord codé en dur pour le seul français. Les FORMES se lisent
                dans `m`, le dictionnaire courant : `t()` ne rend que des
                feuilles, et `notes.count` est un objet de formes. */}
            {fmt.plural(notes.length, m.notes.count, { count: notes.length })}
          </p>

          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {notes.map(note => (
              <li key={note.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 break-words">{note.text}</p>
                    <p
                      className="m-0 text-supporting"
                      style={{ color: 'var(--dwc-text-soft)' }}
                    >
                      {fmt.relative(note.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    iconOnly
                    aria-label={t('notes.remove')}
                    onClick={() => supprimer(note.id)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
