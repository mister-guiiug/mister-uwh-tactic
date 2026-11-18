-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Les schémas d'un compte — pgTAP. Lancement : `supabase test db`.         ║
-- ║                                                                          ║
-- ║ CE QUE CES TESTS PROUVENT : deux comptes ne voient, ne modifient ni      ║
-- ║ n'effacent jamais les schémas l'un de l'autre, `anon` n'y a aucun accès, ║
-- ║ le propriétaire est posé par la base et ne se cède pas, et un schéma ne  ║
-- ║ survit pas à son compte — ni par la cascade, ni par l'effacement.        ║
-- ║                                                                          ║
-- ║ Même méthode que `rls.test.sql` : `set local role authenticated` et      ║
-- ║ `request.jwt.claims`. Sans le rôle, la session garde `bypassrls` et TOUT ║
-- ║ passe — le test serait vert et faux.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

begin;
select plan(17);

-- ── Décor : deux comptes, et un schéma à Bob ──────────────────────────────

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@exemple.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.test');

-- Posé par le serveur (la session de test, sous `postgres`) : c'est le seul
-- endroit d'où l'on peut nommer un propriétaire.
insert into schemas (id, owner, name, version, data) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'à Bob', 1, '{"name":"à Bob"}'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.schemas'::regclass),
  'la RLS est active sur la table des schémas'
);

-- ── `anon` n'a aucun accès ────────────────────────────────────────────────
--
-- Refusé par le premier verrou (42501), avant même que les politiques ne
-- filtrent : la clé anonyme est dans le bundle, elle ne doit rien ouvrir.

set local role anon;

select throws_ok(
  $$ select count(*) from schemas $$, '42501', null,
  'anon ne peut même pas lire la table des schémas'
);
select throws_ok(
  $$ insert into schemas (id, name, version, data)
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
  $$ insert into schemas (id, name, version, data)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'à Alice', 1, '{}') $$,
  'un compte enregistre un schéma sans dire à qui il est'
);
select is(
  (select owner from schemas where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'le propriétaire est posé par la base : c’est auth.uid()'
);

select is(
  (select count(*)::int from schemas),
  1,
  'un compte ne voit que ses propres schémas'
);
select is(
  (select count(*)::int from schemas
   where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'le schéma d’un autre reste invisible, même nommé'
);

-- ── Ce qu'elle ne peut pas faire ──────────────────────────────────────────

select throws_ok(
  $$ insert into schemas (id, owner, name, version, data)
     values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
             '22222222-2222-2222-2222-222222222222', 'au nom de Bob', 1, '{}') $$,
  '42501', null,
  'écrire au nom d’un autre est refusé par la base'
);

select throws_ok(
  $$ update schemas set owner = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'céder son schéma à un autre est refusé : owner ne se met pas à jour'
);

-- L'ÉCRITURE DE L'APPLICATION, braquée sur l'identifiant d'un autre. Le
-- conflit voit la ligne de Bob (l'index unique ignore la RLS), et le chemin
-- `do update` la refuse au lieu de l'écraser — il ne s'esquive jamais en
-- silence, contrairement à un `update` seul.
select throws_ok(
  $$ insert into schemas (id, name, version, data)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'volé', 1, '{}')
     on conflict (id) do update
       set name = excluded.name, version = excluded.version, data = excluded.data $$,
  '42501', null,
  'réécrire le schéma d’un autre par son identifiant est refusé'
);

select lives_ok(
  $$ update schemas set name = 'à Alice, revu', data = '{"revu":true}'
     where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'mais elle modifie le sien'
);

select throws_ok(
  $$ insert into schemas (id, name, version, data)
     values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'liste', 1, '[]') $$,
  '23514', null,
  'une donnée qui n’est pas un objet est refusée'
);

-- Modifier ou supprimer le schéma d'un autre ne lève pas : la RLS le rend
-- invisible, et la requête ne trouve rien. Figé, comme dans `rls.test.sql`.
update schemas set name = 'pris'
 where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from schemas where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
reset role;

select is(
  (select name from schemas where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'à Bob',
  'le schéma d’un autre ne bouge pas sous une tentative de modification'
);
select is(
  (select count(*)::int from schemas
   where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1,
  'et survit à une tentative de suppression'
);

-- ── Un schéma ne survit pas à son compte ──────────────────────────────────

-- Par la cascade : le compte de Bob disparaît d'`auth.users`.
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from schemas
   where owner = '22222222-2222-2222-2222-222222222222'),
  0,
  'la cascade emporte les schémas d’un compte effacé'
);

-- Par l'effacement demandé : `delete_my_account()` les nomme (0006).
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
  'et ses schémas avec lui'
);

select * from finish();
rollback;
