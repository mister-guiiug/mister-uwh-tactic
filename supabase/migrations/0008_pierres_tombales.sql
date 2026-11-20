-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ La suppression suit le compte : une pierre tombale, pas un effacement.   ║
-- ║                                                                          ║
-- ║ Jusqu'ici, supprimer un schéma ou une séance effaçait sa ligne. Un autre ║
-- ║ appareil du même compte, qui le gardait dans sa copie, ne pouvait pas    ║
-- ║ distinguer « supprimé ailleurs » de « jamais envoyé » : il le gardait,   ║
-- ║ et le document revenait (ADR 0015, 0018). Désormais la ligne RESTE,      ║
-- ║ vidée, marquée de l'instant de la suppression (`deleted_at`) ; chaque    ║
-- ║ appareil qui la lit retire sa copie — sauf s'il tient une écriture       ║
-- ║ plus récente, qui gagne (`src/backend/supabase-documents.ts`).           ║
-- ║                                                                          ║
-- ║ UNE LIGNE TOMBÉE NE GARDE RIEN, ni nom ni données : la contrainte        ║
-- ║ `*_tombee_vide` le refuse à tout le monde, client comme migration.       ║
-- ║                                                                          ║
-- ║ PLUS PERSONNE N'EFFACE UNE LIGNE EN DUR, hormis la base elle-même : la   ║
-- ║ purge des vieilles pierres tombales, et l'effacement du compte. Le       ║
-- ║ droit `delete` est retiré au client — une ligne effacée sans trace est   ║
-- ║ exactement le défaut que ce fichier corrige.                             ║
-- ║                                                                          ║
-- ║ LA PURGE SE FAIT SANS pg_cron : chaque écriture d'un compte emporte ses  ║
-- ║ pierres tombales de plus de 180 jours. La preuve est dans                ║
-- ║ `supabase/tests/pierres-tombales.test.sql`.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
-- 1. La pierre tombale
-- ════════════════════════════════════════════════════════════════════════════
--
-- L'INSTANT DU GESTE, DONNÉ PAR LE CLIENT — pas `now()`. Une suppression faite
-- hors ligne à 10 h et envoyée à 18 h a eu lieu à 10 h : c'est cette heure-là
-- qu'une écriture faite ailleurs entre-temps doit battre ou non, comme la date
-- (`updatedAt`) que porte un document, posée elle aussi par l'appareil qui l'a
-- écrit. `updated_at` reste l'heure du SERVEUR (`touch_updated_at`) : c'est
-- sur elle, qu'aucun client ne fausse, que se compte la purge.

alter table public.schemas add column deleted_at timestamptz;
alter table public.seances add column deleted_at timestamptz;

-- Une suppression efface le contenu : le nom recopié comme les données. Le
-- plus petit objet que `*_data_objet` accepte est `{}` ; `version` reste celle
-- qui avait écrit la ligne, elle ne dit rien de ce qu'elle contenait.
alter table public.schemas add constraint schemas_tombee_vide
  check (deleted_at is null or (name = '' and data = '{}'::jsonb));
alter table public.seances add constraint seances_tombee_vide
  check (deleted_at is null or (name = '' and data = '{}'::jsonb));

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Les droits : poser la pierre tombale, ne plus effacer
-- ════════════════════════════════════════════════════════════════════════════
--
-- La pierre tombale est une MISE À JOUR : elle passe par la politique
-- `*_update_own` de 0006 et 0007, inchangée — `using` ET `with check`, chacun
-- les siennes. La colonne rejoint celles qu'un compte peut écrire, une par
-- une ; `owner` en reste exclu. Ressusciter un document, c'est la remettre à
-- `null` dans le même `insert … on conflict (id) do update` qu'un
-- enregistrement ordinaire.

grant update (deleted_at) on public.schemas to authenticated;
grant update (deleted_at) on public.seances to authenticated;

-- LE DROIT D'EFFACER EST RETIRÉ, et sa politique avec lui. Un client d'avant
-- cette migration, ou un appel écrit à la main, effacerait encore une ligne
-- sans laisser de trace — et le document reviendrait des autres appareils.
-- Restent, pour la base seule : la purge ci-dessous et `delete_my_account()`
-- (security definer, 0007), qui nomme les deux tables et emporte TOUT, pierres
-- tombales comprises.
revoke delete on public.schemas from authenticated;
revoke delete on public.seances from authenticated;
drop policy schemas_delete_own on public.schemas;
drop policy seances_delete_own on public.seances;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. La purge des vieilles pierres tombales
-- ════════════════════════════════════════════════════════════════════════════
--
-- UNE PIERRE TOMBALE N'A À DURER QUE LE TEMPS QUE CHAQUE APPAREIL LA LISE.
-- Six mois : une intersaison et sa marge — la tablette du club qui dort de
-- juin à septembre retrouve encore, en rouvrant ses séances, ce qui a été
-- supprimé en juin. Un appareil resté muet plus longtemps garde sa copie ;
-- il ne la renvoie pas pour autant, sauf s'il y a écrit (ADR 0015, suivi du
-- 20/11/2026).
--
-- SANS pg_cron. L'extension se demande projet par projet, et rien ne dit
-- qu'elle sera là le jour où un projet sera branché ; une purge qui dépend
-- d'un réglage qu'on oublie est une purge qui n'a pas lieu. Chaque écriture
-- d'un compte balaie donc les siennes, en passant : un compte qui ne revient
-- jamais garde les quelques octets de ses dernières suppressions, que
-- l'effacement du compte emporte.
--
-- SECURITY DEFINER parce que plus personne n'a le droit `delete` ; bornée au
-- propriétaire de la ligne écrite — que la politique d'écriture vient de
-- vérifier : c'est `auth.uid()`. Une fonction de déclencheur ne s'appelle
-- pas seule ; ses droits d'exécution sont retirés quand même.

create function public.purger_pierres_tombales() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  execute format(
    'delete from %I.%I
      where owner = $1
        and deleted_at is not null
        and updated_at < now() - interval ''180 days''',
    tg_table_schema, tg_table_name
  ) using new.owner;
  return null;
end;
$$;

revoke execute on function public.purger_pierres_tombales()
  from public, anon, authenticated;

create trigger schemas_purger_pierres_tombales
  after insert or update on public.schemas
  for each row execute function purger_pierres_tombales();

create trigger seances_purger_pierres_tombales
  after insert or update on public.seances
  for each row execute function purger_pierres_tombales();
