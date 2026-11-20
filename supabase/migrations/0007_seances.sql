-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Les séances d'un compte — retrouvées sur chaque appareil (ADR 0018).     ║
-- ║                                                                          ║
-- ║ LE MODÈLE EST `0006_schemas.sql`, À LA LETTRE. Une séance se prépare sur ║
-- ║ l'ordinateur et se joue sur la tablette du bord du bassin : comme un     ║
-- ║ schéma, c'est un document qu'on remplace en entier, que l'appareil garde ║
-- ║ d'abord et que cette table ne fait que ranger une seconde fois           ║
-- ║ (`src/backend/supabase-documents.ts`, la même règle pour les deux).      ║
-- ║                                                                          ║
-- ║ PAS DE CLÉ ÉTRANGÈRE VERS `schemas`. Une séance désigne ses schémas par  ║
-- ║ identifiant, dans `data` : l'un peut n'exister que sur un appareil,      ║
-- ║ l'autre avoir été supprimé — la séance le signale et le saute, elle ne   ║
-- ║ disparaît pas avec lui.                                                  ║
-- ║                                                                          ║
-- ║ STRICTEMENT PERSONNELLE, et verrouillée dès sa naissance par les deux    ║
-- ║ verrous de 0003 : droits SQL retirés puis rendus un par un, ET           ║
-- ║ politiques. La preuve est dans `supabase/tests/seances.test.sql`.        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.seances (
  -- Choisi par le client (`createUuid()`), pour qu'une séance créée hors
  -- ligne garde la même identité une fois arrivée ici.
  id uuid primary key,
  -- POSÉ PAR LA BASE, PAS PAR LE CLIENT : l'application n'envoie jamais ce
  -- champ, et la RLS refuserait toute autre valeur que `auth.uid()`.
  owner uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- Recopié de la séance pour qu'une ligne se reconnaisse sans ouvrir `data`.
  -- 80 caractères : la borne du modèle (`SEANCE_LIMITS.name`).
  name text not null default '',
  -- La version du modèle (`SEANCE_VERSION`) qui a écrit `data`.
  version int not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),

  constraint seances_name_longueur check (char_length(name) <= 80),
  constraint seances_version_positive check (version >= 1),
  constraint seances_data_objet check (jsonb_typeof(data) = 'object'),
  -- UN PLAFOND, PAS UNE MESURE. Vingt phases de 280 caractères pèsent une
  -- trentaine de kilo-octets au pire ; 64 Ko laissent grandir le modèle et
  -- empêchent seulement d'utiliser la table comme un dépôt de fichiers.
  constraint seances_data_plafond check (octet_length(data::text) <= 65536)
);

alter table public.seances enable row level security;

create trigger seances_touch_updated_at
  before update on public.seances
  for each row execute function touch_updated_at();

-- Chaque lecture porte sur les séances d'UN compte.
create index seances_owner_idx on public.seances (owner);

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Premier verrou : les droits SQL
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.seances from anon, authenticated;

-- `anon` ne reçoit RIEN ; la mise à jour est accordée colonne par colonne,
-- `owner` exclu : céder sa séance est refusé par les droits avant même
-- d'atteindre la politique. `id` y est pour `insert … on conflict (id) do
-- update`, que PostgREST écrit en recopiant chaque colonne envoyée.
grant select, insert, delete on public.seances to authenticated;
grant update (id, name, version, data) on public.seances to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Second verrou : les politiques — chacun les siennes
-- ════════════════════════════════════════════════════════════════════════════

create policy seances_select_own on public.seances
  for select to authenticated
  using (owner = (select auth.uid()));

create policy seances_insert_own on public.seances
  for insert to authenticated
  with check (owner = (select auth.uid()));

create policy seances_update_own on public.seances
  for update to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

create policy seances_delete_own on public.seances
  for delete to authenticated
  using (owner = (select auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- 3. L'effacement du compte nomme cette table
-- ════════════════════════════════════════════════════════════════════════════
--
-- La cascade de `owner` suffirait. `delete_my_account()` nomme quand même
-- chaque table (la règle de 0005) : la voici complétée — même corps que 0006,
-- une ligne de plus.

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
  delete from public.seances where owner = uid;
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
