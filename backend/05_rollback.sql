-- Restores the pre-05 behaviour (no authenticator requirement). Use only if hardening must be undone quickly. Changes no data.
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'admin', false) $$;
create or replace function is_nurse_of(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'nurse', false) and exists(select 1 from nurse_assignments where child_id = c and nurse_id = auth.uid() and active and starts_at <= now() and (ends_at is null or ends_at > now())) $$;
create or replace function nurse_create_child(nick text, band text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if my_role() <> 'nurse' then raise exception 'nurses only'; end if;
  insert into child_profiles(nickname, age_group, created_by) values (nick, band, auth.uid()) returning id into cid;
  insert into nurse_assignments(child_id, nurse_id, assigned_by) values (cid, auth.uid(), auth.uid());
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id) values (auth.uid(), 'nurse', 'CREATE_CHILD', cid, 'child_profiles', cid);
  return cid;
end $$;
