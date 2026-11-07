-- LUMI backend, part 3: FICTIONAL demonstration data (never run against a production project).
-- First create four users in Supabase Auth (Dashboard > Authentication > Users) with these emails:
--   demo.caregiver@lumi.example, demo.nurse@lumi.example, demo.child@lumi.example, demo.admin@lumi.example
-- Then run this file in the SQL editor (it runs as the owner, so it bypasses RLS on purpose).
do $$
declare cg uuid; nu uuid; kid uuid; ad uuid; ch uuid;
begin
  select id into cg  from auth.users where email = 'demo.caregiver@lumi.example';
  select id into nu  from auth.users where email = 'demo.nurse@lumi.example';
  select id into kid from auth.users where email = 'demo.child@lumi.example';
  select id into ad  from auth.users where email = 'demo.admin@lumi.example';
  if cg is null or nu is null or kid is null or ad is null then
    raise exception 'Create the four demo auth users first (see header).'; end if;

  update profiles set role='caregiver', display_name='Demo Caregiver' where id = cg;
  update profiles set role='nurse',     display_name='Demo Nurse'     where id = nu;
  update profiles set role='child',     display_name='Lily (demo)', preferred_language='en' where id = kid;
  update profiles set role='admin',     display_name='Demo Admin'     where id = ad;

  insert into child_profiles(user_id, nickname, age_group, avatar, theme, language, is_demo, created_by)
  values (kid, 'Lily', '8-10', 'lumi', 'sky', 'en', true, cg) returning id into ch;
  insert into caregiver_relationships(child_id, caregiver_id, relationship, status, verified_by, verified_at)
  values (ch, cg, 'parent', 'active', ad, now());
  insert into nurse_assignments(child_id, nurse_id, assigned_by) values (ch, nu, ad);

  insert into consent_records(child_id, consent_type, granted, granted_by) values
    (ch, 'data_collection', true, cg), (ch, 'share_feelings_summary', true, cg),
    (ch, 'share_health_summary', false, cg), (ch, 'media_photos', false, cg);

  insert into child_preferences(child_id, favorite_activities) values (ch, '{drawing}');
  insert into emotional_checkins(child_id, feelings, wanted_support, asked_to_talk) values (ch, '{scared}', '{nurse}', true);
  insert into symptom_reports(child_id, body_areas, pain_score, quality, wants) values (ch, '{stomach}', 4, 'cramping', '{tell_nurse}');
  insert into wishes(child_id, wish_key, free_text) values (ch, 'draw_with_mother', 'Read a story with my mother');
  insert into family_messages(child_id, author_id, body) values (ch, cg, 'We love you, Lily! (demo message)');
end $$;
