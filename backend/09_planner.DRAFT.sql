-- UNS backend, part 9: MY PLANNER (مخططي).  *** DRAFT. NOT APPLIED. DO NOT RUN ON PRODUCTION. ***
-- Additive only: new types, tables, policies, triggers. Nothing existing is altered, dropped or renamed.
-- Before running: (1) owner review, (2) back up, (3) run on the staging project first, (4) rename the file to 09_planner.sql.
-- Needs 01 + 02 (helpers my_role, is_child_self, is_caregiver_of, has_consent, require_collection_consent, audit_change)
-- and 07 (age groups). Deleting a child (purge_child_data) cascades to these tables through the child_id foreign keys.
--
-- Rules this draft encodes (they match the website demo):
--  * Medication, medical appointments and consultations: created and changed ONLY by the child's active caregiver.
--    A medicine dose can be ticked by the child (self-report) and is then CONFIRMED by the caregiver; appointments/consultations only by the caregiver.
--  * Health routines, education, personal goals, personal activities: the child (or caregiver) can create/change/complete.
--  * Nothing can be collected without the caregiver's existing 'data_collection' consent (same trigger as other child data).
--  * Tasks are never deleted: cancelling sets cancelled_at. A medicine tick can be undone only by the caregiver (audit trail kept).
--  * Nurses get NO planner access here. Whether a nurse may view medication schedules needs a clinical/privacy decision (see PLANNER.md).
--  * IMPORTANT: no child login exists yet, so is_child_self() is false for everyone today. Caregiver writes work now;
--    child-side writes work only after child accounts exist (decision pending). Do not weaken the policies to work around it.

do $$ begin create type planner_category as enum ('medication','appointment','consultation','routine','education','goal','activity');
exception when duplicate_object then null; end $$;
do $$ begin create type planner_repeat as enum ('once','daily','weekly','days','monthly','yearly','range');
exception when duplicate_object then null; end $$;

create table if not exists planner_tasks(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  category planner_category not null,
  start_date date not null,
  dose_times time[] not null default '{}' check (cardinality(dose_times) <= 6),   -- e.g. 4 doses a day; empty = all day
  repeat_kind planner_repeat not null default 'once',
  weekdays smallint[] not null default '{}' check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),   -- 0 = Sunday
  end_date date,
  remind_minutes smallint check (remind_minutes is null or remind_minutes in (0,5,15,60)),          -- null = no reminder
  created_by uuid not null references profiles(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check ((repeat_kind = 'days') = (cardinality(weekdays) > 0)),
  check (repeat_kind <> 'range' or end_date is not null),
  check (remind_minutes is null or cardinality(dose_times) > 0)   -- a reminder needs at least one time
);
create index if not exists planner_tasks_child_idx on planner_tasks(child_id, start_date);

create table if not exists planner_completions(                 -- one row = one dose / one occurrence that was ticked
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references planner_tasks(id) on delete cascade,
  child_id uuid not null references child_profiles(id) on delete cascade,
  occurrence_date date not null,
  slot time,                                                   -- the dose time (null for an all-day task)
  reported_by uuid not null references profiles(id),            -- who pressed the button (child or caregiver)
  reported_at timestamptz not null default now(),
  caregiver_confirmed_by uuid references profiles(id),          -- medication: the caregiver confirms the child's tick
  caregiver_confirmed_at timestamptz,
  unique nulls not distinct (task_id, occurrence_date, slot)
);
create index if not exists planner_completions_child_idx on planner_completions(child_id, occurrence_date);

-- category helper: true for the four categories a child may manage himself or herself
create or replace function planner_is_personal(c planner_category) returns boolean language sql immutable as
$$ select c in ('routine','education','goal','activity') $$;

-- keeps updated_at honest and makes a completion consistent with its task
create or replace function planner_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function planner_check_completion() returns trigger language plpgsql security definer set search_path=public as $$
declare t planner_tasks%rowtype;
begin
  select * into t from planner_tasks where id = new.task_id;
  if not found or t.child_id <> new.child_id then raise exception 'completion does not match its task'; end if;
  if t.cancelled_at is not null then raise exception 'task is cancelled'; end if;
  if new.occurrence_date > current_date then raise exception 'a future day cannot be ticked'; end if;
  if new.slot is not null and not (new.slot = any(t.dose_times)) then raise exception 'unknown dose time'; end if;
  -- appointments and consultations are ticked by the caregiver only; the child may tick personal tasks and report a medicine dose
  if t.category in ('appointment','consultation') and my_role() <> 'caregiver' then raise exception 'caregiver only'; end if;
  if my_role() = 'caregiver' and t.category = 'medication' then new.caregiver_confirmed_by := auth.uid(); new.caregiver_confirmed_at := now(); end if;
  return new;
end $$;

drop trigger if exists t_touch on planner_tasks;
create trigger t_touch before update on planner_tasks for each row execute function planner_touch();
drop trigger if exists t_consent on planner_tasks;
create trigger t_consent before insert on planner_tasks for each row execute function require_collection_consent();
drop trigger if exists t_consent on planner_completions;
create trigger t_consent before insert on planner_completions for each row execute function require_collection_consent();
drop trigger if exists t_check on planner_completions;
create trigger t_check before insert on planner_completions for each row execute function planner_check_completion();
drop trigger if exists t_audit on planner_tasks;
create trigger t_audit after insert or update or delete on planner_tasks for each row execute function audit_change();
drop trigger if exists t_audit on planner_completions;
create trigger t_audit after insert or delete on planner_completions for each row execute function audit_change();

alter table planner_tasks enable row level security;
alter table planner_completions enable row level security;

grant select, insert on planner_tasks to authenticated;
grant update(title, category, start_date, dose_times, repeat_kind, weekdays, end_date, remind_minutes, cancelled_at) on planner_tasks to authenticated;
grant select, insert, delete on planner_completions to authenticated;

-- tasks: the child and the active caregiver can read; the rules above decide who can write what
drop policy if exists pt_sel on planner_tasks;
create policy pt_sel on planner_tasks for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));
drop policy if exists pt_ins on planner_tasks;
create policy pt_ins on planner_tasks for insert to authenticated with check (
  created_by = auth.uid() and (is_caregiver_of(child_id) or (is_child_self(child_id) and planner_is_personal(category))));
drop policy if exists pt_upd on planner_tasks;
create policy pt_upd on planner_tasks for update to authenticated
  using (is_caregiver_of(child_id) or (is_child_self(child_id) and created_by = auth.uid() and planner_is_personal(category)))
  with check (is_caregiver_of(child_id) or (is_child_self(child_id) and created_by = auth.uid() and planner_is_personal(category)));

-- completions: read for child + caregiver; insert checked again by planner_check_completion()
drop policy if exists pc_sel on planner_completions;
create policy pc_sel on planner_completions for select to authenticated using (is_child_self(child_id) or is_caregiver_of(child_id));
drop policy if exists pc_ins on planner_completions;
create policy pc_ins on planner_completions for insert to authenticated with check (
  reported_by = auth.uid() and (is_caregiver_of(child_id) or is_child_self(child_id)));
-- undo: the child may undo a personal task or a medicine dose that is NOT yet confirmed; a caregiver may undo anything of the child
drop policy if exists pc_del on planner_completions;
create policy pc_del on planner_completions for delete to authenticated using (
  is_caregiver_of(child_id)
  or (is_child_self(child_id) and caregiver_confirmed_at is null
      and exists (select 1 from planner_tasks t where t.id = task_id and t.category in ('routine','education','goal','activity','medication'))));
-- the caregiver confirms a medicine dose the child ticked (only these two columns can change)
grant update(caregiver_confirmed_by, caregiver_confirmed_at) on planner_completions to authenticated;
drop policy if exists pc_upd on planner_completions;
create policy pc_upd on planner_completions for update to authenticated using (is_caregiver_of(child_id)) with check (is_caregiver_of(child_id) and caregiver_confirmed_by = auth.uid());

-- ROLLBACK (only if this file was applied and must be undone; it deletes planner data):
--   drop table if exists planner_completions; drop table if exists planner_tasks;
--   drop function if exists planner_check_completion(); drop function if exists planner_touch(); drop function if exists planner_is_personal(planner_category);
--   drop type if exists planner_repeat; drop type if exists planner_category;
