-- UNS: 00_reset.sql — removes everything created by 01_schema.sql and 02_rls.sql so you can run them again from scratch.
-- WARNING: this deletes all data in these tables. Use only on a new/test project. It does not touch Supabase's own tables.

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists code_attempts, family_codes, audit_logs, activities, educational_content, notifications,
  nursing_notes, report_reviews, wishes, family_messages, memories, saved_drawings, child_preferences,
  symptom_reports, emotional_checkins, consent_records, nurse_assignments, caregiver_relationships,
  child_profiles, profiles cascade;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array[
      'gen_code','hash_code','set_nurse_code','my_role','is_admin','is_child_self','is_caregiver_of','is_nurse_of',
      'has_consent','caregiver_feelings_summary','caregiver_health_summary','log_access','nurse_create_child',
      'nurse_create_family_code','redeem_family_code','nurse_revoke_caregiver','nurse_verify_code','my_nurse_code',
      'child_nurses','admin_verify_caregiver','admin_link_child_user','admin_set_role','admin_list_children',
      'purge_child_data','create_child_profile','handle_new_user','require_collection_consent','block_mutation',
      'emit_signals','audit_change'])
  loop execute 'drop function if exists ' || r.fn || ' cascade'; end loop;
end $$;

drop type if exists signal_type, wish_status, review_status, content_category, consent_type, lang_code, user_role cascade;

-- storage policies from 02_rls.sql (ignored if they do not exist or cannot be dropped from here)
do $$
declare p text;
begin
  foreach p in array array['media_sel','media_ins','media_del','assets_sel','assets_w'] loop
    begin execute format('drop policy if exists %I on storage.objects', p);
    exception when others then null; end;
  end loop;
end $$;
