-- UNS backend, part 5: hardening (audit findings S1 and S3).
-- Safe to run once on a live project: only CREATE OR REPLACE / new function, no table is touched, no data changes.
-- ORDER: deploy the updated website FIRST (nurses and admins now need the authenticator-app screen), THEN run this file.
-- Prerequisite: in Supabase, Authentication > Multi-Factor must allow TOTP (it is on by default).

-- S1: server-side MFA. Nurse and admin access now requires an authenticator-verified session (aal2).
create or replace function is_aal2() returns boolean language sql stable as
$$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;
revoke execute on function is_aal2() from public, anon;
grant execute on function is_aal2() to authenticated;

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'admin', false) and is_aal2() $$;

create or replace function is_nurse_of(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'nurse', false) and is_aal2()
   and exists(select 1 from nurse_assignments where child_id = c and nurse_id = auth.uid() and active and starts_at <= now() and (ends_at is null or ends_at > now())) $$;

create or replace function nurse_create_child(nick text, band text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if my_role() <> 'nurse' or not is_aal2() then raise exception 'nurses only (authenticator verification required)'; end if;
  insert into child_profiles(nickname, age_group, created_by) values (nick, band, auth.uid()) returning id into cid;
  insert into nurse_assignments(child_id, nurse_id, assigned_by) values (cid, auth.uid(), auth.uid());
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id) values (auth.uid(), 'nurse', 'CREATE_CHILD', cid, 'child_profiles', cid);
  return cid;
end $$;

-- S3: nurse codes are an identifier, no longer the security factor (MFA is). New codes are longer; existing codes are NOT changed.
create or replace function set_nurse_code() returns trigger language plpgsql set search_path=public as $$
begin
  if new.role = 'nurse' then
    if new.nurse_code is null then
      loop
        new.nurse_code := 'N' || gen_code(7);
        exit when not exists(select 1 from profiles where nurse_code = new.nurse_code);
      end loop;
    end if;
  else new.nurse_code := null; end if;
  return new;
end $$;
