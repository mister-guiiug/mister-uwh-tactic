-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Les séances d'un compte — pgTAP. Lancement : `supabase test db`.         ║
-- ║                                                                          ║
-- ║ CE QUE CES TESTS PROUVENT, comme `schemas.test.sql` dont ils suivent le  ║
-- ║ plan : deux comptes ne voient, ne modifient ni n'effacent jamais les     ║
-- ║ séances l'un de l'autre, `anon` n'y a aucun accès, le propriétaire est   ║
-- ║ posé par la base et ne se cède pas, et une séance ne survit pas à son    ║
-- ║ compte — ni par la cascade, ni par l'effacement.                         ║
-- ║                                                                          ║
-- ║ `set local role authenticated` et `request.jwt.claims` : sans le rôle,   ║
-- ║ la session garde `bypassrls` et TOUT passe — le test serait vert et faux.║
-- ╚══════════════════════════════════════════════════════════════════════════╝

begin;
select plan(19);

-- ── Décor : deux comptes, et une séance à Bob ─────────────────────────────

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@exemple.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.test');

insert into seances (id, owner, name, version, data) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'à Bob', 1, '{"name":"à Bob","items":[]}'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.seances'::regclass),
  'la RLS est active sur la table des séances'
);

-- ── `anon` n'a aucun accès ────────────────────────────────────────────────

set local role anon;

select throws_ok(
  $$ select count(*) from seances $$, '42501', null,
  'anon ne peut même pas lire la table des séances'
);
select throws_ok(
  $$ insert into seances (id, name, version, data)
     values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'anonyme', 1, '{}') $$,
  '42501', null,
  'anon ne peut pas y écrire'
);

-- ── Alice, connectée ──────────────────────────────────────────────────────

reset role;
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Exactement ce qu'envoie l'application : ni `owner` ni `updated_at`.
select lives_ok(
  $$ insert into seances (id, name, version, data)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Mardi', 1, '{"items":[]}') $$,
  'un compte enregistre une séance sans dire à qui elle est'
);
select is(
  (select owner from seances where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'le propriétaire est posé par la base : c’est auth.uid()'
);

select is(
  (select count(*)::int from seances),
  1,
  'un compte ne voit que ses propres séances'
);
select is(
  (select count(*)::int from seances
   where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'la séance d’un autre reste invisible, même nommée'
);

-- ── Ce qu'elle ne peut pas faire ──────────────────────────────────────────

select throws_ok(
  $$ insert into seances (id, owner, name, version, data)
     values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
             '22222222-2222-2222-2222-222222222222', 'au nom de Bob', 1, '{}') $$,
  '42501', null,
  'écrire au nom d’un autre est refusé par la base'
);

select throws_ok(
  $$ update seances set owner = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'céder sa séance à un autre est refusé : owner ne se met pas à jour'
);

-- L'écriture de l'application, braquée sur l'identifiant d'un autre : le
-- chemin `do update` la refuse au lieu de l'écraser.
select throws_ok(
  $$ insert into seances (id, name, version, data)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'volée', 1, '{}')
     on conflict (id) do update
       set name = excluded.name, version = excluded.version, data = excluded.data $$,
  '42501', null,
  'réécrire la séance d’un autre par son identifiant est refusé'
);

select lives_ok(
  $$ update seances set name = 'Mardi, revu', data = '{"revu":true}'
     where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'mais elle modifie la sienne'
);

select throws_ok(
  $$ insert into seances (id, name, version, data)
     values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'liste', 1, '[]') $$,
  '23514', null,
  'une donnée qui n’est pas un objet est refusée'
);

select throws_ok(
  $$ insert into seances (id, name, version, data)
     values ('ffffffff-ffff-4fff-8fff-ffffffffffff', repeat('n', 81), 1, '{}') $$,
  '23514', null,
  'un nom de plus de 80 caractères est refusé'
);

-- Modifier la séance d'un autre ne lève pas : la RLS la rend invisible, et la
-- requête ne trouve rien. L'effacer en dur lève, depuis 0008 : supprimer,
-- c'est poser une pierre tombale (`pierres-tombales.test.sql`).
update seances set name = 'prise'
 where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select throws_ok(
  $$ delete from seances where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$,
  '42501', null,
  'effacer en dur la séance d’un autre est refusé par les droits (0008)'
);
reset role;

select is(
  (select name from seances where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'à Bob',
  'la séance d’un autre ne bouge pas sous une tentative de modification'
);
select is(
  (select count(*)::int from seances
   where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1,
  'et survit à une tentative de suppression'
);

-- ── Une séance ne survit pas à son compte ─────────────────────────────────

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from seances
   where owner = '22222222-2222-2222-2222-222222222222'),
  0,
  'la cascade emporte les séances d’un compte effacé'
);

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ select delete_my_account() $$,
  'Alice efface son compte'
);
reset role;

select is(
  (select count(*)::int from seances
   where owner = '11111111-1111-1111-1111-111111111111'),
  0,
  'et ses séances avec lui (0007)'
);

select * from finish();
rollback;
