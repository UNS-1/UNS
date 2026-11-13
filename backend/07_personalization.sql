-- UNS backend, part 7: age-based personalization for ages 7-12.
-- Additive. Existing accounts, children, consents and data are untouched. Safe to run twice.
-- Order: after 01, 02 and 05. Back up first (Database > Backups). Upload/deploy the website before or after; it works either way.

-- 1) Age groups. New: 7-8 (Discovery), 9-10 (Exploration), 11-12 (Independence).
--    The earlier values 5-7 and 8-10 stay valid, so every existing child keeps working. A caregiver can confirm the new group at any time.
alter table child_profiles drop constraint if exists child_profiles_age_group_check;
alter table child_profiles add constraint child_profiles_age_group_check check (age_group in ('5-7','8-10','7-8','9-10','11-12'));
alter table educational_content drop constraint if exists educational_content_age_groups_check;
alter table educational_content add constraint educational_content_age_groups_check check (age_groups <@ array['5-7','8-10','7-8','9-10','11-12']);
alter table activities drop constraint if exists activities_age_groups_check;
alter table activities add constraint activities_age_groups_check check (age_groups <@ array['5-7','8-10','7-8','9-10','11-12']) not valid;  -- new and changed rows only

-- 2) Personalization settings live next to the child's other preferences.
alter table child_preferences add column if not exists settings jsonb not null default '{}';
create or replace function validate_child_settings() returns trigger language plpgsql as $$
begin
  if jsonb_typeof(new.settings) <> 'object' or pg_column_size(new.settings) > 2000 then raise exception 'invalid settings'; end if;
  if exists (select 1 from jsonb_object_keys(new.settings) k where k not in ('challenge','hints')) then raise exception 'unknown setting'; end if;
  if new.settings ? 'challenge' and new.settings->>'challenge' not in ('auto','keep') then raise exception 'invalid challenge setting'; end if;
  if new.settings ? 'hints' and jsonb_typeof(new.settings->'hints') not in ('boolean','null') then raise exception 'invalid hints setting'; end if;
  return new;
end $$;
drop trigger if exists t_child_settings on child_preferences;
create trigger t_child_settings before insert or update on child_preferences for each row execute function validate_child_settings();

-- 3) Current play level per skill line. Play settings only: not scores, not assessments. The last 5 outcomes are kept so the level can adapt.
create table if not exists skill_levels(
  child_id uuid not null references child_profiles(id) on delete cascade,
  skill text not null check (skill in ('puzzle','memory','match','quiz')),
  level smallint not null check (level between 1 and 10),
  recent jsonb not null default '[]' check (jsonb_typeof(recent) = 'array' and jsonb_array_length(recent) <= 5 and pg_column_size(recent) < 1000),
  updated_at timestamptz not null default now(),
  primary key (child_id, skill));
alter table skill_levels enable row level security;
revoke all on skill_levels from anon, authenticated;
grant select, insert, update on skill_levels to authenticated;
-- The child, or an active caregiver supervising play on their own device. Nurses do not read play levels by default (data minimisation).
drop policy if exists sl_sel on skill_levels; drop policy if exists sl_ins on skill_levels; drop policy if exists sl_upd on skill_levels;
create policy sl_sel on skill_levels for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));
create policy sl_ins on skill_levels for insert to authenticated with check (is_child_self(child_id) or is_caregiver_of(child_id));
create policy sl_upd on skill_levels for update to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id)) with check (is_child_self(child_id) or is_caregiver_of(child_id));
drop trigger if exists t_consent on skill_levels;
create trigger t_consent before insert on skill_levels for each row execute function require_collection_consent();   -- caregiver consent first

-- 4) Changing the age group: a caregiver or the care nurse (verified with the authenticator), through this function only.
create or replace function set_child_age_group(c uuid, band text) returns void language plpgsql security definer set search_path=public as $$
begin
  if band not in ('7-8','9-10','11-12') then raise exception 'invalid age group'; end if;
  if not (is_caregiver_of(c) or is_nurse_of(c)) then raise exception 'only a caregiver or the care nurse can change the age group'; end if;
  update child_profiles set age_group = band where id = c;
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id, detail)
  values (auth.uid(), my_role(), 'SET_AGE_GROUP', c, 'child_profiles', c, jsonb_build_object('to', band));
end $$;
revoke execute on function set_child_age_group(uuid, text) from public, anon;
grant execute on function set_child_age_group(uuid, text) to authenticated;
