\set ON_ERROR_STOP on
\o /dev/null
\set CG1 '00000000-0000-0000-0000-0000000000e1'
\set CG2 '00000000-0000-0000-0000-0000000000e2'
\set NU  '00000000-0000-0000-0000-0000000000e3'
\set KD  '00000000-0000-0000-0000-0000000000e4'
select id as cid from child_profiles where nickname='Rana' \gset
-- (a report written BEFORE migration 08 was inserted by run.sh)
select t_assert((select count(*) from symptom_reports where child_id=:'cid' and body_marks is null and body_areas='{head}')=1, 'pre-existing report kept, marks empty');
set role authenticated;
select set_config('request.jwt.claim.sub',:'KD',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
insert into symptom_reports(child_id,body_areas,pain_score,body_marks) values (:'cid','{stomach}',4,'{"v":1,"fig":"9-10","front":[[[500,520]],[[480,540],[500,560],[520,540]]],"back":[]}');
insert into symptom_reports(child_id,body_areas,pain_score) values (:'cid','{head}',2);
insert into symptom_reports(child_id,pain_score,body_marks) values (:'cid',0,jsonb_build_object('v',1,'fig','11-12','front',(select jsonb_agg((select jsonb_agg(jsonb_build_array(10,10)) from generate_series(1,120))) from generate_series(1,5)),'back','[]'::jsonb));
\echo PASS 08: valid marks, no marks, and the maximum (600 points) are accepted; the older report is untouched
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"5-7","front":[],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":2,"fig":"9-10","front":[],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[],"back":[],"note":"x"}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'[1,2]')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[[]],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[[[1001,5]]],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[[[-1,5]]],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[[["a",5]]],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,'{"v":1,"fig":"9-10","front":[[[1,2,3]]],"back":[]}')$$,:'cid'));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,%L::jsonb)$$,:'cid',(select jsonb_build_object('v',1,'fig','9-10','front',(select jsonb_agg('[[1,1]]'::jsonb) from generate_series(1,41)),'back','[]'::jsonb)::text)));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,%L::jsonb)$$,:'cid',(select jsonb_build_object('v',1,'fig','9-10','front',jsonb_build_array((select jsonb_agg(jsonb_build_array(1,1)) from generate_series(1,121))),'back','[]'::jsonb)::text)));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,%L::jsonb)$$,:'cid',(select jsonb_build_object('v',1,'fig','9-10','front',(select jsonb_agg((select jsonb_agg(jsonb_build_array(10,10)) from generate_series(1,120))) from generate_series(1,6)),'back','[]'::jsonb)::text)));
select t_fails(format($$insert into symptom_reports(child_id,pain_score,body_marks) values (%L,1,%L::jsonb)$$,:'cid',(select jsonb_build_object('v',1,'fig','9-10','front',jsonb_build_array(jsonb_build_array(jsonb_build_array(repeat('9',20000)::numeric,1))),'back','[]'::jsonb)::text)));
\echo PASS 08: wrong figure, version, extra or missing fields, empty strokes, out-of-range or non-numeric points, too many strokes/points and oversized data are all rejected
-- who can read the marks
select set_config('request.jwt.claim.sub',:'NU',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select t_assert((select count(*) from symptom_reports where body_marks is not null)=2, 'assigned nurse (aal2) reads the marks');
select set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_assert((select count(*) from symptom_reports)=0, 'nurse without the authenticator sees nothing');
select set_config('request.jwt.claim.sub',:'CG1',false) \gset
select t_assert((select count(*) from symptom_reports)=0, 'caregiver has no direct access');
reset role; insert into consent_records(child_id,consent_type,granted,granted_by) values (:'cid','share_health_summary',true,:'CG1'); set role authenticated;
select t_assert((select count(*) from caregiver_health_summary(:'cid'::uuid))>=1 and not exists(select 1 from caregiver_health_summary(:'cid'::uuid) s where to_jsonb(s) ? 'body_marks'), 'the caregiver summary never includes the drawing');
select set_config('request.jwt.claim.sub',:'CG2',false) \gset
select t_assert((select count(*) from symptom_reports)=0, 'unrelated caregiver sees nothing');
reset role; select t_fails(format($$update symptom_reports set body_marks=null where child_id=%L$$,:'cid'));
\echo PASS the assigned nurse (with authenticator) reads marks; nobody else can; the caregiver summary excludes the drawing; reports stay append-only
\i :migration08
select t_assert((select count(*) from symptom_reports where body_marks is not null)=2, 'second run changed nothing');
\echo PASS migration 08 is safe to run twice
\echo ALL BODYMAP DB TESTS PASSED
