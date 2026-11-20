-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Les pierres tombales des schémas et des séances — pgTAP (0008).          ║
-- ║                                                                          ║
-- ║ CE QUE CES TESTS PROUVENT : supprimer, c'est poser une pierre tombale —  ║
-- ║ une mise à jour qui vide la ligne et la date ; une pierre tombale ne     ║
-- ║ garde rien ; personne n'efface plus une ligne en dur ; on ne pose pas    ║
-- ║ celle d'un autre ; `anon` ne voit rien ; l'écriture d'un compte emporte  ║
-- ║ ses pierres tombales de plus de 180 jours, et seulement les siennes ; et ║
-- ║ l'effacement du compte emporte tout, pierres tombales comprises.         ║
-- ║                                                                          ║
-- ║ Chaque geste est joué sur les DEUX tables : elles suivent la même règle  ║
-- ║ (`src/backend/supabase-documents.ts`), la preuve aussi.                  ║
-- ║                                                                          ║
-- ║ `set local role authenticated` et `request.jwt.claims` : sans le rôle,   ║
-- ║ la session garde `bypassrls` et TOUT passe — le test serait vert et faux.║
-- ╚══════════════════════════════════════════════════════════════════════════╝

begin;
select plan(37);

-- ── Décor ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@exemple.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.test');

-- Posé par le serveur. La purge est SUSPENDUE le temps de poser des pierres
-- tombales déjà vieilles : sinon, elle les emporterait dès leur insertion —
-- c'est son travail. Elle reprend avant le premier geste d'Alice.
alter table schemas disable trigger schemas_purger_pierres_tombales;
alter table seances disable trigger seances_purger_pierres_tombales;

-- Pour Alice : un document vivant (…0002), une pierre tombale de 200 jours
-- (…0003, à purger), une de 100 jours (…0004, à garder), un document vivant
-- vieux de 400 jours (…0005 : la purge ne touche que les pierres tombales).
-- Pour Bob : un document vivant (…0001) et une pierre tombale de 200 jours
-- (…0003) — les écritures d'Alice n'ont pas à la balayer.
insert into schemas (id, owner, name, version, data, deleted_at, updated_at)
values
  ('aaaaaaaa-0002-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'gardé', 1, '{"name":"gardé"}', null, now()),
  ('aaaaaaaa-0003-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   '', 1, '{}', now() - interval '200 days', now() - interval '200 days'),
  ('aaaaaaaa-0004-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   '', 1, '{}', now() - interval '100 days', now() - interval '100 days'),
  ('aaaaaaaa-0005-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'ancien', 1, '{"name":"ancien"}', null, now() - interval '400 days'),
  ('bbbbbbbb-0001-4000-8000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'à Bob', 1, '{"name":"à Bob"}', null, now()),
  ('bbbbbbbb-0003-4000-8000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   '', 1, '{}', now() - interval '200 days', now() - interval '200 days');

insert into seances (id, owner, name, version, data, deleted_at, updated_at)
values
  ('aaaaaaaa-0002-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'gardée', 1, '{"name":"gardée","items":[]}', null, now()),
  ('aaaaaaaa-0003-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   '', 1, '{}', now() - interval '200 days', now() - interval '200 days'),
  ('aaaaaaaa-0004-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   '', 1, '{}', now() - interval '100 days', now() - interval '100 days'),
  ('aaaaaaaa-0005-4000-8000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'ancienne', 1, '{"name":"ancienne","items":[]}', null,
   now() - interval '400 days'),
  ('bbbbbbbb-0001-4000-8000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'à Bob', 1, '{"name":"à Bob","items":[]}', null, now()),
  ('bbbbbbbb-0003-4000-8000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   '', 1, '{}', now() - interval '200 days', now() - interval '200 days');

alter table schemas enable trigger schemas_purger_pierres_tombales;
alter table seances enable trigger seances_purger_pierres_tombales;

select ok(
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'schemas'
             and column_name = 'deleted_at'),
  'les schémas ont une pierre tombale : deleted_at'
);
select ok(
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'seances'
             and column_name = 'deleted_at'),
  'les séances aussi'
);

-- ── `anon` ne voit rien, ne pose rien ─────────────────────────────────────

set local role anon;

select throws_ok(
  $$ select id, deleted_at from schemas $$, '42501', null,
  'anon ne lit aucune pierre tombale de schéma'
);
select throws_ok(
  $$ update schemas set name = '', data = '{}', deleted_at = now() $$,
  '42501', null,
  'anon n’en pose aucune'
);
select throws_ok(
  $$ select id, deleted_at from seances $$, '42501', null,
  'anon ne lit aucune pierre tombale de séance'
);
select throws_ok(
  $$ update seances set name = '', data = '{}', deleted_at = now() $$,
  '42501', null,
  'anon n’en pose aucune'
);

reset role;

-- ── Alice, connectée : les gestes de l'application ────────────────────────

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Les schémas.

-- L'enregistrement tel que l'écrit PostgREST : chaque colonne envoyée est
-- recopiée dans le `set`, `deleted_at` à null compris.
select lives_ok(
  $$ insert into schemas (id, name, version, data, deleted_at)
     values ('aaaaaaaa-0001-4000-8000-000000000000', 'à jeter', 1,
             '{"name":"à jeter"}', null)
     on conflict (id) do update
       set id = excluded.id, name = excluded.name, version = excluded.version,
           data = excluded.data, deleted_at = excluded.deleted_at $$,
  'un schéma s’enregistre comme l’écrit l’application, deleted_at à null'
);
select lives_ok(
  $$ update schemas
        set name = '', data = '{}', deleted_at = '2026-11-20T10:00:00.000Z'
      where id = 'aaaaaaaa-0001-4000-8000-000000000000' $$,
  'supprimer un schéma, c’est poser sa pierre tombale : une mise à jour'
);
select is(
  (select deleted_at from schemas
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  '2026-11-20T10:00:00.000Z'::timestamptz,
  'la ligne reste, datée de l’instant du geste que l’appareil a donné'
);
select ok(
  (select name = '' and data = '{}'::jsonb from schemas
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  'et ne garde ni nom ni données'
);
select throws_ok(
  $$ update schemas set deleted_at = now()
      where id = 'aaaaaaaa-0002-4000-8000-000000000000' $$,
  '23514', null,
  'une pierre tombale qui garderait ses données est refusée'
);
select throws_ok(
  $$ delete from schemas where id = 'aaaaaaaa-0002-4000-8000-000000000000' $$,
  '42501', null,
  'effacer un schéma en dur est refusé, même le sien'
);
-- Un `update` braqué sur la ligne d'un autre ne lève pas : la RLS la rend
-- invisible. Vérifié plus bas, sous le serveur.
update schemas set name = '', data = '{}', deleted_at = now()
 where id = 'bbbbbbbb-0001-4000-8000-000000000000';
select throws_ok(
  $$ insert into schemas (id, name, version, data, deleted_at)
     values ('bbbbbbbb-0001-4000-8000-000000000000', '', 1, '{}', now())
     on conflict (id) do update
       set name = excluded.name, data = excluded.data,
           deleted_at = excluded.deleted_at $$,
  '42501', null,
  'poser la pierre tombale du schéma d’un autre par son identifiant est refusé'
);
select lives_ok(
  $$ insert into schemas (id, name, version, data, deleted_at)
     values ('aaaaaaaa-0001-4000-8000-000000000000', 'revenu', 1,
             '{"name":"revenu"}', null)
     on conflict (id) do update
       set id = excluded.id, name = excluded.name, version = excluded.version,
           data = excluded.data, deleted_at = excluded.deleted_at $$,
  'une écriture plus récente ressuscite le schéma : le même enregistrement'
);
select ok(
  (select deleted_at is null and name = 'revenu' from schemas
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  'il revit, avec son contenu'
);

-- Les séances, geste pour geste.

select lives_ok(
  $$ insert into seances (id, name, version, data, deleted_at)
     values ('aaaaaaaa-0001-4000-8000-000000000000', 'à jeter', 1,
             '{"name":"à jeter","items":[]}', null)
     on conflict (id) do update
       set id = excluded.id, name = excluded.name, version = excluded.version,
           data = excluded.data, deleted_at = excluded.deleted_at $$,
  'une séance s’enregistre comme l’écrit l’application, deleted_at à null'
);
select lives_ok(
  $$ update seances
        set name = '', data = '{}', deleted_at = '2026-11-20T10:00:00.000Z'
      where id = 'aaaaaaaa-0001-4000-8000-000000000000' $$,
  'supprimer une séance, c’est poser sa pierre tombale : une mise à jour'
);
select is(
  (select deleted_at from seances
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  '2026-11-20T10:00:00.000Z'::timestamptz,
  'la ligne reste, datée de l’instant du geste que l’appareil a donné'
);
select ok(
  (select name = '' and data = '{}'::jsonb from seances
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  'et ne garde ni nom ni données'
);
select throws_ok(
  $$ update seances set deleted_at = now()
      where id = 'aaaaaaaa-0002-4000-8000-000000000000' $$,
  '23514', null,
  'une pierre tombale qui garderait ses données est refusée'
);
select throws_ok(
  $$ delete from seances where id = 'aaaaaaaa-0002-4000-8000-000000000000' $$,
  '42501', null,
  'effacer une séance en dur est refusé, même la sienne'
);
update seances set name = '', data = '{}', deleted_at = now()
 where id = 'bbbbbbbb-0001-4000-8000-000000000000';
select throws_ok(
  $$ insert into seances (id, name, version, data, deleted_at)
     values ('bbbbbbbb-0001-4000-8000-000000000000', '', 1, '{}', now())
     on conflict (id) do update
       set name = excluded.name, data = excluded.data,
           deleted_at = excluded.deleted_at $$,
  '42501', null,
  'poser la pierre tombale de la séance d’un autre par son identifiant est refusé'
);
select lives_ok(
  $$ insert into seances (id, name, version, data, deleted_at)
     values ('aaaaaaaa-0001-4000-8000-000000000000', 'revenue', 1,
             '{"name":"revenue","items":[]}', null)
     on conflict (id) do update
       set id = excluded.id, name = excluded.name, version = excluded.version,
           data = excluded.data, deleted_at = excluded.deleted_at $$,
  'une écriture plus récente ressuscite la séance : le même enregistrement'
);
select ok(
  (select deleted_at is null and name = 'revenue' from seances
    where id = 'aaaaaaaa-0001-4000-8000-000000000000'),
  'elle revit, avec son contenu'
);

reset role;

-- ── Sous le serveur : ce qui a bougé, et ce qui n'a pas bougé ─────────────

select ok(
  (select deleted_at is null and name = 'à Bob' from schemas
    where id = 'bbbbbbbb-0001-4000-8000-000000000000'),
  'le schéma d’un autre ne tombe pas sous une tentative'
);
select is(
  (select count(*)::int from schemas
    where id = 'aaaaaaaa-0003-4000-8000-000000000000'),
  0,
  'l’écriture d’un compte emporte ses pierres tombales de plus de 180 jours'
);
select is(
  (select count(*)::int from schemas
    where id in ('aaaaaaaa-0004-4000-8000-000000000000',
                 'aaaaaaaa-0005-4000-8000-000000000000')),
  2,
  'mais garde les plus jeunes, et les schémas vivants même anciens'
);
select is(
  (select count(*)::int from schemas
    where id = 'bbbbbbbb-0003-4000-8000-000000000000'),
  1,
  'et ne balaie pas celles d’un autre compte'
);

select ok(
  (select deleted_at is null and name = 'à Bob' from seances
    where id = 'bbbbbbbb-0001-4000-8000-000000000000'),
  'la séance d’un autre ne tombe pas sous une tentative'
);
select is(
  (select count(*)::int from seances
    where id = 'aaaaaaaa-0003-4000-8000-000000000000'),
  0,
  'l’écriture d’un compte emporte ses pierres tombales de séance de plus de 180 jours'
);
select is(
  (select count(*)::int from seances
    where id in ('aaaaaaaa-0004-4000-8000-000000000000',
                 'aaaaaaaa-0005-4000-8000-000000000000')),
  2,
  'mais garde les plus jeunes, et les séances vivantes même anciennes'
);
select is(
  (select count(*)::int from seances
    where id = 'bbbbbbbb-0003-4000-8000-000000000000'),
  1,
  'et ne balaie pas celles d’un autre compte'
);

-- ── L'effacement du compte emporte tout ───────────────────────────────────

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ select delete_my_account() $$,
  'Alice efface son compte'
);
reset role;

select is(
  (select count(*)::int from schemas
    where owner = '11111111-1111-1111-1111-111111111111'),
  0,
  'et tous ses schémas avec lui, pierres tombales comprises'
);
select is(
  (select count(*)::int from seances
    where owner = '11111111-1111-1111-1111-111111111111'),
  0,
  'et toutes ses séances, pierres tombales comprises'
);

-- Par la cascade : le compte de Bob disparaît d'`auth.users`.
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from schemas
    where owner = '22222222-2222-2222-2222-222222222222'),
  0,
  'la cascade emporte aussi les pierres tombales de schéma'
);
select is(
  (select count(*)::int from seances
    where owner = '22222222-2222-2222-2222-222222222222'),
  0,
  'et celles de séance'
);

select * from finish();
rollback;
