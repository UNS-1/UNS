\set ON_ERROR_STOP on
\o /dev/null
\set N1 '00000000-0000-0000-0000-0000000000b1'
\set N2 '00000000-0000-0000-0000-0000000000b2'
\set C1 '00000000-0000-0000-0000-0000000000c1'
\set C2 '00000000-0000-0000-0000-0000000000c2'
\set KD '00000000-0000-0000-0000-0000000000d1'
\set AD '00000000-0000-0000-0000-0000000000a4'
insert into auth.users(id,email) values (:'N1','n1'),(:'N2','n2'),(:'C1','c1'),(:'C2','c2'),(:'KD','kid'),(:'AD','ad');
update profiles set role='nurse' where id in (:'N1',:'N2'); update profiles set role='child' where id=:'KD'; update profiles set role='admin' where id=:'AD';
select t_assert((select count(*) from profiles where id in (:'N1',:'N2') and nurse_code ~ '^N[0-9A-F]{7}$')=2, 'nurse codes are N + 7 chars');
select t_assert((select count(*) from profiles where role<>'nurse' and nurse_code is not null)=0, 'only nurses have codes');
\echo PASS nurse codes generated (N + 7 chars), only for nurses
set role authenticated;
select set_config('request.jwt.claim.sub',:'N1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_fails('select nurse_create_child(''Lily'',''8-10'')');
\echo PASS nurse without authenticator verification cannot register a child
select set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select nurse_create_child('Lily','8-10') as cid \gset
select nurse_create_family_code(:'cid') as code \gset
select t_assert((select count(*) from child_profiles)=1, 'nurse (aal2) sees the child');
select t_assert(:'code' ~ '^[A-Z0-9]{5}-[A-Z0-9]{5}$', 'family code format');
select t_fails('select code_hash from family_codes');
\echo PASS nurse (aal2) registers a child and creates a code; code hash is hidden
select set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_assert((select count(*) from child_profiles)=0, 'nurse aal1 sees nothing');
\echo PASS nurse at aal1 sees no children
select set_config('request.jwt.claim.sub',:'N2',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select t_fails(format('select nurse_create_family_code(%L)',:'cid'));
select t_assert((select count(*) from child_profiles)=0, 'unassigned nurse sees nothing');
\echo PASS unassigned nurse is blocked
select set_config('request.jwt.claim.sub',:'C1',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_assert((select count(*) from child_profiles)=0, 'caregiver sees nothing before linking');
select t_assert(redeem_family_code('AAAAA-AAAAA') is null, 'wrong 1'), t_assert(redeem_family_code('BBBBB-BBBBB') is null, 'wrong 2'), t_assert(redeem_family_code('CCCCC-CCCCC') is null, 'wrong 3'), t_assert(redeem_family_code('DDDDD-DDDDD') is null, 'wrong 4'), t_assert(redeem_family_code('EEEEE-EEEEE') is null, 'wrong 5');
select t_fails(format('select redeem_family_code(%L)',:'code'));
\echo PASS wrong codes are counted; the sixth attempt is blocked even with the right code
select set_config('request.jwt.claim.sub',:'C2',false) \gset
select redeem_family_code(lower(replace(:'code','-',''))) as got \gset
select t_assert(:'got'::uuid = :'cid'::uuid, 'caregiver 2 linked');
select t_assert((select count(*) from child_profiles)=1, 'caregiver sees the child');
select t_assert((select count(*) from child_nurses(:'cid'::uuid))=1, 'nurse name visible to caregiver');
select t_assert(redeem_family_code(:'code') is null, 'code is single use');
select t_assert((select count(*) from family_codes)=0, 'caregiver cannot read codes');
\echo PASS caregiver links with the code (any case, dash optional); the code is single-use
select set_config('request.jwt.claim.sub',:'AD',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_fails(format('select admin_link_child_user(%L,%L)',:'cid',:'KD'));
select set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select admin_link_child_user(:'cid',:'KD');
select t_assert((select count(*) from admin_list_children() where id=:'cid'::uuid)=1, 'admin lists children (id and nickname only)');
select t_assert((select count(*) from emotional_checkins)=0, 'admin sees no health data');
\echo PASS admin needs aal2 and cannot read health data
select set_config('request.jwt.claim.sub',:'KD',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_fails(format('insert into emotional_checkins(child_id,feelings) values(%L,''{scared}'')',:'cid'));
select set_config('request.jwt.claim.sub',:'C2',false) \gset
insert into consent_records(child_id,consent_type,granted,granted_by) values(:'cid','data_collection',true,:'C2');
select set_config('request.jwt.claim.sub',:'KD',false) \gset
insert into emotional_checkins(child_id,feelings,free_text,asked_to_talk) values(:'cid','{scared}','private words',true);
insert into symptom_reports(child_id,body_areas,pain_score,wants) values(:'cid','{stomach}',4,'{tell_nurse}');
select t_fails(format('insert into symptom_reports(child_id,pain_score) values(%L,3)',:'cid'));
\echo PASS consent is required first; FPS-R score 3 is rejected
select set_config('request.jwt.claim.sub',:'C2',false) \gset
select t_assert((select count(*) from emotional_checkins)=0, 'caregiver has no direct read');
select t_assert((select count(*) from caregiver_feelings_summary(:'cid'::uuid))=0, 'no summary without consent');
insert into consent_records(child_id,consent_type,granted,granted_by) values(:'cid','share_feelings_summary',true,:'C2');
select t_assert((select count(*) from caregiver_feelings_summary(:'cid'::uuid))=1, 'summary after consent');
\echo PASS caregiver gets a consent-gated summary only
select set_config('request.jwt.claim.sub',:'N1',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select t_assert((select count(*) from emotional_checkins)=1, 'nurse reads check-in');
select t_assert((select count(*) from notifications)>=3, 'signals created for the nurse');
select log_access(:'cid','OPEN_PROFILE');
insert into nursing_notes(child_id,author_id,kind,body) values(:'cid',:'N1','review','seen');
select t_fails('update emotional_checkins set free_text=''x''');
\echo PASS nurse (aal2) reads reports, gets signals, writes notes, cannot edit child data
select set_config('request.jwt.claim.sub',:'KD',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_fails('update profiles set role=''admin'' where id=auth.uid()');
select set_config('request.jwt.claim.sub',:'N1',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select id as rel from caregiver_relationships limit 1 \gset
select nurse_revoke_caregiver(:'rel');
select set_config('request.jwt.claim.sub',:'C2',false), set_config('request.jwt.claims','{"aal":"aal1"}',false) \gset
select t_assert((select count(*) from child_profiles)=0, 'revoked caregiver loses access');
\echo PASS role escalation blocked; revoked caregiver loses access
select set_config('request.jwt.claim.sub',:'AD',false), set_config('request.jwt.claims','{"aal":"aal2"}',false) \gset
select purge_child_data(:'cid');
reset role;
select t_assert((select count(*) from emotional_checkins)=0, 'child records purged');
select t_assert((select count(*) from audit_logs)>5, 'audit log kept');
\echo PASS purge removes the child records; the audit log is kept
\echo ALL DB TESTS PASSED
