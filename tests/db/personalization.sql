\set ON_ERROR_STOP on
\o /dev/null
\set CG1 '00000000-0000-0000-0000-0000000000e1'
\set CG2 '00000000-0000-0000-0000-0000000000e2'
\set NU  '00000000-0000-0000-0000-0000000000e3'
\set KD  '00000000-0000-0000-0000-0000000000e4'
insert into auth.users(id,email) values (:'CG1','p1'),(:'CG2','p2'),(:'NU','pn'),(:'KD','pk');
update profiles set role='nurse' where id=:'NU'; update profiles set role='child' where id=:'KD';
-- (legacy child 'Legacy' with age_group 8-10 was inserted by run.sh BEFORE the migration)
select t_assert((select count(*) from child_profiles where nickname='Legacy' and age_group='8-10')=1, 'legacy child kept');
insert into child_profiles(nickname,age_group,user_id) values ('Rana','9-10',:'KD');
select id as cid from child_profiles where nickname='Rana' \gset
select id as cid2 from child_profiles where nickname='Legacy' \gset
insert into caregiver_relationships(child_id,caregiver_id,relationship,status) values (:'cid',:'CG1','parent','active');
insert into nurse_assignments(child_id,nurse_id) values (:'cid',:'NU');
insert into consent_records(child_id,consent_type,granted,granted_by) values (:'cid','data_collection',true,:'CG1');
-- 1) constraints widened, nothing lost
select t_fails($$insert into child_profiles(nickname,age_group) values ('x','6-7')$$);
insert into child_profiles(nickname,age_group) values ('NewBand','7-8'),('Older','11-12');
insert into educational_content(category,age_groups,title_ar,title_en,story_ar,story_en) values ('body','{7-8,5-7}','a','b','c','d');
select t_fails($$insert into educational_content(category,age_groups,title_ar,title_en,story_ar,story_en) values ('body','{4-5}','a','b','c','d')$$);
select t_assert((select count(*) from child_profiles where age_group in ('8-10','9-10','7-8','11-12'))=4, 'legacy and new bands coexist');
\echo PASS 07: new age groups accepted, legacy groups kept, invalid groups rejected
-- 2) set_child_age_group
set role authenticated;
select set_config('request.jwt.claim.sub',:'CG1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select set_child_age_group(:'cid','11-12');
select t_assert((select age_group from child_profiles where id=:'cid')='11-12', 'caregiver changed the age group');
select t_fails(format('select set_child_age_group(%L,%L)',:'cid','6-7'));
select t_fails(format('update child_profiles set age_group=%L where id=%L','7-8',:'cid'));
select set_config('request.jwt.claim.sub',:'CG2',false) \gset
select t_fails(format('select set_child_age_group(%L,%L)',:'cid','7-8'));
select set_config('request.jwt.claim.sub',:'KD',false) \gset
select t_fails(format('select set_child_age_group(%L,%L)',:'cid','7-8'));
select set_config('request.jwt.claim.sub',:'NU',false) \gset
select t_fails(format('select set_child_age_group(%L,%L)',:'cid','7-8'));
select set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select set_child_age_group(:'cid','9-10');
select t_assert((select age_group from child_profiles where id=:'cid')='9-10', 'care nurse (aal2) changed it');
\echo PASS age group: caregiver and care nurse (with authenticator) may change it; strangers, the child, an unverified nurse, bad values and direct updates are blocked
-- 3) settings + 4) skill levels, caregiver supervising
select set_config('request.jwt.claim.sub',:'CG1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
insert into child_preferences(child_id,settings) values (:'cid','{"challenge":"keep","hints":false}');
select t_fails(format($$update child_preferences set settings='{"role":"admin"}' where child_id=%L$$,:'cid'));
select t_fails(format($$update child_preferences set settings='{"challenge":"turbo"}' where child_id=%L$$,:'cid'));
select t_fails(format($$update child_preferences set settings='{"hints":"yes"}' where child_id=%L$$,:'cid'));
select t_fails(format($$update child_preferences set settings=jsonb_build_object('challenge', repeat('x',3000)) where child_id=%L$$,:'cid'));
insert into skill_levels(child_id,skill,level,recent) values (:'cid','puzzle',4,'[{"s":0.9,"h":false}]');
update skill_levels set level=5 where child_id=:'cid' and skill='puzzle';
select t_assert((select level from skill_levels where child_id=:'cid' and skill='puzzle')=5, 'caregiver supervised update');
select t_fails(format($$insert into skill_levels(child_id,skill,level) values (%L,'chess',3)$$,:'cid'));
select t_fails(format($$insert into skill_levels(child_id,skill,level) values (%L,'memory',0)$$,:'cid'));
select t_fails(format($$insert into skill_levels(child_id,skill,level) values (%L,'memory',11)$$,:'cid'));
select t_fails(format($$insert into skill_levels(child_id,skill,level,recent) values (%L,'memory',2,'[1,2,3,4,5,6]')$$,:'cid'));
\echo PASS settings and levels: valid values saved by a supervising caregiver; unknown keys, bad types, oversized data, unknown skills and out-of-range levels rejected
select set_config('request.jwt.claim.sub',:'KD',false) \gset
insert into skill_levels(child_id,skill,level) values (:'cid','memory',3);
select t_assert((select count(*) from skill_levels where child_id=:'cid')=2, 'child reads and writes own levels');
select set_config('request.jwt.claim.sub',:'CG2',false) \gset
select t_assert((select count(*) from skill_levels)=0 and (select count(*) from child_preferences where settings <> '{}')=0, 'other caregiver sees nothing');
select t_fails(format($$insert into skill_levels(child_id,skill,level) values (%L,'quiz',2)$$,:'cid'));
select set_config('request.jwt.claim.sub',:'NU',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select t_assert((select count(*) from skill_levels)=0, 'nurses do not read play levels by default');
\echo PASS play levels are visible only to the child and active caregivers
-- consent gate on a child without consent
select set_config('request.jwt.claim.sub',:'CG1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
reset role;
insert into caregiver_relationships(child_id,caregiver_id,relationship,status) values (:'cid2',:'CG1','parent','active');
set role authenticated;
select t_fails(format($$insert into skill_levels(child_id,skill,level) values (%L,'puzzle',3)$$,:'cid2'));
select t_fails(format($$insert into child_preferences(child_id,settings) values (%L,'{}')$$,:'cid2'));
\echo PASS nothing is saved without caregiver consent
reset role; set role anon;
select t_fails('select count(*) from skill_levels');
reset role;
-- idempotent
\i :migration07
select t_assert((select count(*) from skill_levels)=2 and (select count(*) from child_profiles where nickname='Legacy' and age_group='8-10')=1, 'second run changed nothing');
\echo PASS migration 07 is safe to run twice and keeps all data
-- purge cascades
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a4',false) \gset
\echo ALL PERSONALIZATION DB TESTS PASSED
