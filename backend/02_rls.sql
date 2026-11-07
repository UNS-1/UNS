-- UNS backend, part 2: privileges, row-level security, storage
-- Principle: deny by default. Only the 'authenticated' role gets any table access; 'anon' gets none.
-- Administrators manage content, roles, logs and settings. They have NO policy on child health data.

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- trigger functions are never called directly
revoke execute on function set_nurse_code(), handle_new_user(), require_collection_consent(), block_mutation(), emit_signals(), audit_change() from authenticated;

alter table profiles enable row level security;
alter table child_profiles enable row level security;
alter table caregiver_relationships enable row level security;
alter table nurse_assignments enable row level security;
alter table consent_records enable row level security;
alter table emotional_checkins enable row level security;
alter table symptom_reports enable row level security;
alter table child_preferences enable row level security;
alter table saved_drawings enable row level security;
alter table memories enable row level security;
alter table family_messages enable row level security;
alter table wishes enable row level security;
alter table report_reviews enable row level security;
alter table nursing_notes enable row level security;
alter table notifications enable row level security;
alter table educational_content enable row level security;
alter table activities enable row level security;
alter table audit_logs enable row level security;
alter table family_codes enable row level security;
alter table code_attempts enable row level security;   -- no policies and no grants: only the security-definer functions touch it

-- profiles: read own; role/is_active can only change through admin_set_role()
grant select on profiles to authenticated;
grant update(display_name, preferred_language) on profiles to authenticated;
create policy p_sel on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy p_upd on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- child_profiles: child, active caregiver, assigned nurse. Creation only via create_child_profile().
grant select on child_profiles to authenticated;
grant update(nickname, avatar, theme, comm_method, language) on child_profiles to authenticated;
create policy c_sel on child_profiles for select to authenticated
  using (is_child_self(id) or is_caregiver_of(id) or is_nurse_of(id));
create policy c_upd on child_profiles for update to authenticated
  using (is_child_self(id) or is_caregiver_of(id)) with check (is_child_self(id) or is_caregiver_of(id));

grant select on caregiver_relationships to authenticated;
create policy r_sel on caregiver_relationships for select to authenticated using (caregiver_id = auth.uid() or is_admin() or is_nurse_of(child_id));

-- Family codes: the nurse who issued them can see status (never the code or its hash). Creation only via nurse_create_family_code().
grant select(id, child_id, nurse_id, expires_at, used_by, used_at, created_at) on family_codes to authenticated;
create policy fcodes_sel on family_codes for select to authenticated using (nurse_id = auth.uid() and is_nurse_of(child_id));

grant select, insert, update on nurse_assignments to authenticated;
create policy na_sel on nurse_assignments for select to authenticated using (nurse_id = auth.uid() or is_admin());
create policy na_ins on nurse_assignments for insert to authenticated with check (is_admin());
create policy na_upd on nurse_assignments for update to authenticated using (is_admin()) with check (is_admin());

grant select, insert on consent_records to authenticated;
create policy cr_sel on consent_records for select to authenticated using (is_caregiver_of(child_id) or is_nurse_of(child_id));
create policy cr_ins on consent_records for insert to authenticated with check (is_caregiver_of(child_id) and granted_by = auth.uid());

-- Child-generated clinical-style data: the child writes, the child and assigned nurses read.
-- Caregivers have NO direct policy (use caregiver_*_summary functions).
grant select, insert on emotional_checkins, symptom_reports to authenticated;
create policy ec_sel on emotional_checkins for select to authenticated using (is_child_self(child_id) or is_nurse_of(child_id));
create policy ec_ins on emotional_checkins for insert to authenticated with check (is_child_self(child_id));
create policy sr_sel on symptom_reports for select to authenticated using (is_child_self(child_id) or is_nurse_of(child_id));
create policy sr_ins on symptom_reports for insert to authenticated with check (is_child_self(child_id));

grant select, insert, update on child_preferences to authenticated;
create policy cp_sel on child_preferences for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id) or is_nurse_of(child_id));
create policy cp_ins on child_preferences for insert to authenticated with check (is_child_self(child_id) or is_caregiver_of(child_id));
create policy cp_upd on child_preferences for update to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id)) with check (is_child_self(child_id) or is_caregiver_of(child_id));

-- Creative content: child + caregiver can view and delete; nurses have no default access (data minimisation).
grant select, insert, delete on saved_drawings to authenticated;
create policy sd_sel on saved_drawings for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));
create policy sd_ins on saved_drawings for insert to authenticated with check (is_child_self(child_id));
create policy sd_del on saved_drawings for delete to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));

grant select, insert, delete on memories to authenticated;
create policy m_sel on memories for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));
create policy m_ins on memories for insert to authenticated with check ((is_child_self(child_id) or is_caregiver_of(child_id)) and created_by = auth.uid());
create policy m_del on memories for delete to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));

grant select, insert on family_messages to authenticated;
create policy fm_sel on family_messages for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id) or is_nurse_of(child_id));
create policy fm_ins on family_messages for insert to authenticated with check (is_caregiver_of(child_id) and author_id = auth.uid());

-- Wishes: child submits; caregiver or nurse may only change status/review fields.
grant select, insert on wishes to authenticated;
grant update(status, reviewed_by, reviewed_at, reviewer_note) on wishes to authenticated;
create policy w_sel on wishes for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id) or is_nurse_of(child_id));
create policy w_ins on wishes for insert to authenticated with check (is_child_self(child_id));
create policy w_upd on wishes for update to authenticated
  using (is_caregiver_of(child_id) or is_nurse_of(child_id))
  with check ((is_caregiver_of(child_id) or is_nurse_of(child_id)) and reviewed_by = auth.uid());

-- Professional data: assigned nurses only. Children and caregivers cannot read nursing notes.
grant select, insert on report_reviews, nursing_notes to authenticated;
create policy rv_sel on report_reviews for select to authenticated using (is_nurse_of(child_id));
create policy rv_ins on report_reviews for insert to authenticated with check (is_nurse_of(child_id) and nurse_id = auth.uid());
create policy nn_sel on nursing_notes for select to authenticated using (is_nurse_of(child_id));
create policy nn_ins on nursing_notes for insert to authenticated with check (is_nurse_of(child_id) and author_id = auth.uid());

grant select on notifications to authenticated;
grant update(seen_at) on notifications to authenticated;
create policy n_sel on notifications for select to authenticated using (recipient_id = auth.uid());
create policy n_upd on notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Content: everyone signed in sees APPROVED content only; admins manage everything.
grant select, insert, update, delete on educational_content, activities to authenticated;
create policy ed_sel on educational_content for select to authenticated using (status = 'approved' or is_admin());
create policy ed_w on educational_content for all to authenticated using (is_admin()) with check (is_admin());
create policy ac_sel on activities for select to authenticated using (is_active or is_admin());
create policy ac_w on activities for all to authenticated using (is_admin()) with check (is_admin());

grant select on audit_logs to authenticated;
create policy al_sel on audit_logs for select to authenticated using (is_admin());

-- ---------- Storage (Supabase) ----------
-- Private bucket; objects are stored as <child_id>/<file>. No public URLs.
insert into storage.buckets(id, name, public) values ('child-media', 'child-media', false) on conflict (id) do nothing;
insert into storage.buckets(id, name, public) values ('content-assets', 'content-assets', false) on conflict (id) do nothing;

create policy media_sel on storage.objects for select to authenticated
  using (bucket_id = 'child-media' and (is_child_self(((storage.foldername(name))[1])::uuid) or is_caregiver_of(((storage.foldername(name))[1])::uuid)));
create policy media_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'child-media' and (is_child_self(((storage.foldername(name))[1])::uuid) or is_caregiver_of(((storage.foldername(name))[1])::uuid)));
create policy media_del on storage.objects for delete to authenticated
  using (bucket_id = 'child-media' and (is_child_self(((storage.foldername(name))[1])::uuid) or is_caregiver_of(((storage.foldername(name))[1])::uuid)));
create policy assets_sel on storage.objects for select to authenticated using (bucket_id = 'content-assets');
create policy assets_w on storage.objects for all to authenticated using (bucket_id = 'content-assets' and is_admin()) with check (bucket_id = 'content-assets' and is_admin());
