\set ON_ERROR_STOP on
\o /dev/null
-- legacy row inserted BEFORE the draft migration must survive untouched
select t_assert((select count(*) from activities where title_en = 'Legacy puzzle' and kind = 'puzzle' and dimensions = '{}' and objectives = '{}') = 1, 'pre-existing activity row kept');
select t_assert((select count(*) from developmental_objectives) = 34, '34 objectives seeded');
select t_assert((select count(*) from activities where slug is not null) = 20, '20 activities seeded');
select t_assert((select count(distinct dimension) from developmental_objectives) = 5, 'five dimensions');
select t_assert((select count(*) from activities where cardinality(dimensions) > 1) = 15, 'multi-dimension activities');
\echo PASS draft 06: 34 objectives, 20 activities, 15 multi-dimension, legacy row untouched
-- trigger rules (run as the table owner)
select t_fails($$insert into activities(slug,kind,title_ar,title_en,objectives,dimensions) values ('x1','puzzle','a','b','{nonsense}','{cog}')$$);
select t_fails($$insert into activities(slug,kind,title_ar,title_en,objectives,dimensions) values ('x2','puzzle','a','b','{memory}','{emo}')$$);
select t_fails($$insert into activities(slug,kind,title_ar,title_en,activity_type) values ('x3','puzzle','a','b','scoreboard')$$);
select t_fails($$insert into activities(slug,kind,title_ar,title_en,age_groups) values ('x4','puzzle','a','b','{3-4}')$$);
insert into activities(slug,kind,title_ar,title_en,objectives,dimensions,age_groups) values ('ok1','puzzle','a','b','{memory,empathy}','{cog,soc}','{8-10}');
\echo PASS unknown objectives, dimension mismatches, unknown types and bad ages are rejected; a consistent row is accepted
-- idempotent: running the migration again changes nothing
\i :migration
select t_assert((select count(*) from developmental_objectives) = 34 and (select count(*) from activities where slug is not null) = 21, 'idempotent');
\echo PASS migration is safe to run twice
-- access: everyone signed in can read; only admins can write; anon sees nothing
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
set role authenticated;
select t_assert((select count(*) from developmental_objectives) = 34, 'signed-in users can read objectives');
select t_fails($$insert into developmental_objectives(key,dimension,label_ar,label_en) values ('hack','cog','a','b')$$);
update activities set dimensions = '{}';  -- row-level security must make this change nothing for a non-admin
select t_assert((select count(*) from activities where cardinality(dimensions) > 1) = 16, 'non-admin update changed nothing');
reset role; grant execute on function public.t_fails(text) to anon; -- 02_rls.sql revoked anon's execute rights; the test helper needs one
set role anon;
select t_fails('select count(*) from developmental_objectives');
reset role;
\echo PASS framework tables: readable when signed in, not writable by non-admins, invisible to anonymous
\echo ALL FRAMEWORK DB TESTS PASSED
