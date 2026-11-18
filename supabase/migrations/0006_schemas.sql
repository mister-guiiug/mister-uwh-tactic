-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Les schémas tactiques d'un compte — retrouvés sur chaque appareil.       ║
-- ║                                                                          ║
-- ║ L'APPAREIL RESTE LA VÉRITÉ. Le tableau enregistre d'abord dans son       ║
-- ║ magasin local ; cette table est le second endroit où un compte range     ║
-- ║ ses schémas, et que chaque appareil vient fusionner                      ║
-- ║ (`src/backend/supabase-schemas.ts`). Elle ne sert jamais à attendre.     ║
-- ║                                                                          ║
-- ║ STRICTEMENT PERSONNELLE. Partager entre les entraîneurs d'un club        ║
-- ║ demanderait un modèle de club — qui en est, qui y écrit — que cette      ║
-- ║ application n'a pas. Les politiques ne s'élargiront pas sans lui.        ║
-- ║                                                                          ║
-- ║ VERROUILLÉE DÈS SA NAISSANCE, avec les deux verrous de 0003 : droits SQL ║
-- ║ retirés puis rendus un par un, ET politiques. La preuve est dans         ║
-- ║ `supabase/tests/schemas.test.sql`.                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.schemas (
  -- `uuid` et non `text`, à l'inverse des notes : l'identifiant d'un schéma
  -- vient de `createUuid()` du socle, qui en produit déjà un. Le client le
  -- choisit, pour qu'un schéma créé hors ligne garde la même identité une
  -- fois arrivé ici.
  id uuid primary key,
  -- POSÉ PAR LA BASE, PAS PAR LE CLIENT : l'application n'envoie jamais ce
  -- champ, et la RLS refuserait toute autre valeur que `auth.uid()`.
  owner uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- Recopié du schéma pour qu'une ligne se reconnaisse sans ouvrir `data`.
  name text not null default '',
  -- La version du modèle (`TACTIC_VERSION`) qui a écrit `data`. Le client
  -- monte toujours ce qu'il lit (`migrateTactic`) : ce numéro sert à
  -- reconnaître, dans un journal, une ligne venue d'une version plus récente.
  version int not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),

  constraint schemas_name_longueur check (char_length(name) <= 60),
  constraint schemas_version_positive check (version >= 1),
  constraint schemas_data_objet check (jsonb_typeof(data) = 'object'),
  -- UN PLAFOND, PAS UNE MESURE. Un schéma de trente étapes pèse quelques
  -- dizaines de kilo-octets ; un mégaoctet laisse grandir le modèle, et
  -- empêche seulement d'utiliser la table comme un dépôt de fichiers.
  constraint schemas_data_plafond check (octet_length(data::text) <= 1048576)
);

alter table public.schemas enable row level security;

create trigger schemas_touch_updated_at
  before update on public.schemas
  for each row execute function touch_updated_at();

-- Chaque lecture porte sur les schémas d'UN compte : sans cet index, elle
-- balaierait la table entière, et la politique avec elle.
create index schemas_owner_idx on public.schemas (owner);

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Premier verrou : les droits SQL
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.schemas from anon, authenticated;

-- `anon` ne reçoit RIEN. Et la mise à jour est accordée COLONNE PAR COLONNE,
-- `owner` exclu : donner sa ligne à quelqu'un d'autre est refusé par les
-- droits avant même d'atteindre la politique. `id` y est parce que l'écriture
-- du client est un `insert … on conflict (id) do update`, et que PostgREST
-- recopie dans le `set` chaque colonne envoyée.
grant select, insert, delete on public.schemas to authenticated;
grant update (id, name, version, data) on public.schemas to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Second verrou : les politiques
-- ════════════════════════════════════════════════════════════════════════════

-- `(select auth.uid())` et non `auth.uid()` nu : la sous-requête est évaluée
-- une fois par requête au lieu d'une fois par ligne — la forme que
-- recommande l'analyseur de performances de Supabase. Le sens est le même.
create policy schemas_select_own on public.schemas
  for select to authenticated
  using (owner = (select auth.uid()));

create policy schemas_insert_own on public.schemas
  for insert to authenticated
  with check (owner = (select auth.uid()));

create policy schemas_update_own on public.schemas
  for update to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

create policy schemas_delete_own on public.schemas
  for delete to authenticated
  using (owner = (select auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- 3. L'effacement du compte nomme cette table
-- ════════════════════════════════════════════════════════════════════════════
--
-- La cascade de `owner` suffirait aujourd'hui. `delete_my_account()` efface
-- quand même chaque table explicitement, et c'est la règle de 0005 : le jour
-- où une table perd sa cascade, la liste de la fonction est l'endroit où on la
-- relit. La voici complétée — même corps, une ligne de plus.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'suppression de compte sans session'
      using errcode = '42501';
  end if;

  -- LES DONNÉES DE L'APPLICATION, NOMMÉES UNE PAR UNE (cf. 0005).
  delete from public.schemas where owner = uid;
  delete from public.notes where user_id = uid;
  delete from public.user_roles where user_id = uid;
  delete from public.profiles where id = uid;

  delete from auth.users where id = uid;
end;
$$;

-- `create or replace` garde les droits de la fonction remplacée ; on les
-- répète quand même, pour que ce fichier se lise seul.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
