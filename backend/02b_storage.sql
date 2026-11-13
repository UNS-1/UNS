-- UNS backend, part 2b: private storage buckets and policies (run AFTER 02_rls.sql, in its own query).
-- If Supabase refuses a statement here, security of the tables is NOT affected; storage is only needed later for drawings/photos.
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
