-- UNS backend, part 1: schema, helper functions, triggers (PostgreSQL / Supabase)
-- Synthetic data only. Not clinically approved, not legally reviewed.
-- Run order: 01_schema.sql -> 02_rls.sql -> (optional) 03_seed_demo.sql

create type user_role as enum ('child','caregiver','nurse','admin');
create type lang_code as enum ('ar','en');
create type consent_type as enum ('data_collection','share_feelings_summary','share_health_summary','media_photos');
create type content_category as enum ('body','hospital','nurse','tests','treatment','self_care','feelings');
create type review_status as enum ('draft','in_review','approved','retired');
create type wish_status as enum ('submitted','seen','being_planned','done','not_possible');
create type signal_type as enum ('feels_scared','reports_pain','needs_help','wants_nurse');

-- ---------- identity ----------
create table profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'caregiver',          -- elevated only via admin_set_role()
  display_name text not null check (char_length(display_name) between 1 and 60),
  preferred_language lang_code not null default 'ar',
  is_active boolean not null default true,
  nurse_code text unique,                                -- private code per nurse, generated when role becomes 'nurse'
  created_at timestamptz not null default now());

-- Minimal child data: nickname + age band only. No legal name, no birth date.
create table child_profiles(
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles(id) on delete set null,
  nickname text not null check (char_length(nickname) between 1 and 30),
  age_group text not null check (age_group in ('5-7','8-10','11-12')),
  avatar text, theme text check (theme in ('sky','garden','sea','cloud')),
  comm_method text[] not null default '{}' check (comm_method <@ array['pictures','audio','text']),
  language lang_code not null default 'ar',
  is_demo boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now());

create table caregiver_relationships(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  caregiver_id uuid not null references profiles(id) on delete cascade,
  relationship text not null,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  verified_by uuid references profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(child_id, caregiver_id));

create table nurse_assignments(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  nurse_id uuid not null references profiles(id) on delete cascade,
  active boolean not null default true,
  assigned_by uuid references profiles(id),
  starts_at timestamptz not null default now(), ends_at timestamptz,
  unique(child_id, nurse_id));

-- Family codes: a nurse gives each child's family a single-use code. Only a hash is stored; the code is shown once.
create table family_codes(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  nurse_id uuid not null references profiles(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references profiles(id), used_at timestamptz,
  created_at timestamptz not null default now());

create table code_attempts(       -- failed code entries, used to rate-limit guessing (5 per 15 minutes)
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  at timestamptz not null default now());

-- Append-only. The latest row per (child, type) is the current state; revoke = new row with granted=false.
create table consent_records(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  consent_type consent_type not null,
  granted boolean not null,
  granted_by uuid not null references profiles(id),
  recorded_at timestamptz not null default now());

-- ---------- child-generated data ----------
create table emotional_checkins(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  feelings text[] not null check (cardinality(feelings) between 1 and 10 and feelings <@ array['happy','sad','scared','worried','angry','lonely','tired','calm','confused','dont_know']),
  free_text text check (char_length(free_text) <= 500),
  wanted_support text[] not null default '{}' check (wanted_support <@ array['talk','story','draw','family','quiet','nurse']),
  asked_to_talk boolean not null default false,
  created_at timestamptz not null default now());

create table symptom_reports(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  body_areas text[] not null default '{}' check (body_areas <@ array['head','chest','stomach','back','arms','legs','other']),
  pain_scale text not null default 'FPS-R',
  pain_score smallint check (pain_score in (0,2,4,6,8,10)),   -- FPS-R scoring, never modified
  pain_unable boolean not null default false,                 -- child could not use the scale: professional assessment needed
  quality text check (quality in ('sharp','burning','aching','cramping','tingling','not_sure')),
  symptoms text[] not null default '{}' check (symptoms <@ array['nausea','tiredness','sleep','breathing','dizziness','appetite','other']),
  wants text[] not null default '{}' check (wants <@ array['tell_nurse','tell_parent','need_help','rest']),
  created_at timestamptz not null default now(),
  check (not (pain_unable and pain_score is not null)));

create table child_preferences(
  child_id uuid primary key references child_profiles(id) on delete cascade,
  favorite_activities text[] not null default '{}' check (favorite_activities <@ array['drawing','stories','music','puzzles','family']),
  updated_at timestamptz not null default now());

create table saved_drawings(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  storage_path text not null, title text, created_at timestamptz not null default now());

create table memories(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  kind text not null check (kind in ('drawing','photo','message','moment','family_activity')),
  storage_path text, caption text check (char_length(caption) <= 300),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now());

create table family_messages(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now());

create table wishes(
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  wish_key text not null, free_text text check (char_length(free_text) <= 300),
  status wish_status not null default 'submitted',          -- fulfilment is never guaranteed
  reviewed_by uuid references profiles(id), reviewed_at timestamptz, reviewer_note text,
  created_at timestamptz not null default now());

-- ---------- professional data (kept separate from child data) ----------
create table report_reviews(      -- "reviewed by a nurse" is a fact stored here, not a flag on the child's row
  id uuid primary key default gen_random_uuid(),
  report_table text not null check (report_table in ('emotional_checkins','symptom_reports')),
  report_id uuid not null,
  child_id uuid not null references child_profiles(id) on delete cascade,
  nurse_id uuid not null references profiles(id),
  reviewed_at timestamptz not null default now(),
  unique(report_table, report_id, nurse_id));

create table nursing_notes(       -- append-only; corrections are new notes with amends_id
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  author_id uuid not null references profiles(id),
  kind text not null check (kind in ('review','communication','support','follow_up','observation')),
  body text not null check (char_length(body) between 1 and 4000),
  follow_up_plan text check (char_length(follow_up_plan) <= 2000),
  amends_id uuid references nursing_notes(id),
  created_at timestamptz not null default now());

-- A notification only says "a human should look". It is not a review and not a clinical urgency decision.
create table notifications(
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  child_id uuid not null references child_profiles(id) on delete cascade,
  signal signal_type not null,
  source_table text not null, source_id uuid not null,
  created_at timestamptz not null default now(), seen_at timestamptz);

-- ---------- content ----------
create table educational_content(
  id uuid primary key default gen_random_uuid(),
  category content_category not null,
  age_groups text[] not null default '{}' check (age_groups <@ array['5-7','8-10','11-12']),
  title_ar text not null, title_en text not null,
  story_ar text not null, story_en text not null,
  quiz jsonb, audio_path text, illustration_path text,
  status review_status not null default 'draft',
  reviewer_name text, reviewed_at date, source_reference text,
  updated_at timestamptz not null default now(),
  constraint approved_requires_review check (status <> 'approved' or (reviewer_name is not null and reviewed_at is not null and source_reference is not null)));

create table activities(
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('coloring','story','relaxation','puzzle','memory','matching')),
  title_ar text not null, title_en text not null, asset_path text,
  age_groups text[] not null default '{}', is_active boolean not null default true);

create table audit_logs(          -- no FK to child_profiles so logs survive a purge; never stores report content
  id bigint generated always as identity primary key,
  actor_id uuid, actor_role user_role, action text not null,
  child_id uuid, target_table text, target_id uuid,
  detail jsonb not null default '{}', at timestamptz not null default now());

create index on emotional_checkins(child_id, created_at desc);
create index on symptom_reports(child_id, created_at desc);
create index on notifications(recipient_id, created_at desc);
create index on nursing_notes(child_id, created_at desc);
create index on audit_logs(child_id, at desc);

-- ---------- codes ----------
create function gen_code(n int) returns text language sql volatile as
$$ select upper(substr(translate(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), '01', ''), 1, n)) $$;
create function hash_code(c text) returns text language sql immutable as
$$ select encode(sha256(convert_to(upper(regexp_replace(c, '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex') $$;

create function set_nurse_code() returns trigger language plpgsql set search_path=public as $$
begin
  if new.role = 'nurse' then
    if new.nurse_code is null then
      loop
        new.nurse_code := 'N' || gen_code(5);
        exit when not exists(select 1 from profiles where nurse_code = new.nurse_code);
      end loop;
    end if;
  else new.nurse_code := null; end if;
  return new;
end $$;
create trigger t_nurse_code before insert or update of role on profiles for each row execute function set_nurse_code();

-- ---------- helper functions (security definer so RLS policies can call them without recursion) ----------
create function my_role() returns user_role language sql stable security definer set search_path=public as
$$ select role from profiles where id = auth.uid() and is_active $$;

create function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'admin', false) $$;

create function is_child_self(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'child', false) and exists(select 1 from child_profiles where id = c and user_id = auth.uid()) $$;

create function is_caregiver_of(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'caregiver', false) and exists(select 1 from caregiver_relationships where child_id = c and caregiver_id = auth.uid() and status = 'active') $$;

create function is_nurse_of(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() = 'nurse', false) and exists(select 1 from nurse_assignments where child_id = c and nurse_id = auth.uid() and active and starts_at <= now() and (ends_at is null or ends_at > now())) $$;

create function has_consent(c uuid, t consent_type) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select granted from consent_records where child_id = c and consent_type = t order by recorded_at desc, id desc limit 1), false) $$;

-- Caregivers never read raw child rows. They get consent-gated summaries without free text.
create function caregiver_feelings_summary(c uuid) returns table(created_at timestamptz, feelings text[])
language sql stable security definer set search_path=public as
$$ select e.created_at, e.feelings from emotional_checkins e
   where e.child_id = c and is_caregiver_of(c) and has_consent(c,'share_feelings_summary')
   order by e.created_at desc limit 50 $$;

create function caregiver_health_summary(c uuid) returns table(created_at timestamptz, body_areas text[])
language sql stable security definer set search_path=public as
$$ select s.created_at, s.body_areas from symptom_reports s
   where s.child_id = c and is_caregiver_of(c) and has_consent(c,'share_health_summary')
   order by s.created_at desc limit 50 $$;

-- The app must call this when a nurse/caregiver opens a child's profile (RLS cannot audit SELECTs).
create function log_access(c uuid, act text, d jsonb default '{}') returns void language plpgsql security definer set search_path=public as $$
begin
  if not (is_nurse_of(c) or is_caregiver_of(c) or is_child_self(c)) then raise exception 'not authorized'; end if;
  insert into audit_logs(actor_id, actor_role, action, child_id, detail) values (auth.uid(), my_role(), act, c, d);
end $$;

-- ---------- controlled operations ----------
-- The NURSE registers the child (so the child is linked to that nurse from the start).
create function nurse_create_child(nick text, band text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if my_role() <> 'nurse' then raise exception 'nurses only'; end if;
  insert into child_profiles(nickname, age_group, created_by) values (nick, band, auth.uid()) returning id into cid;
  insert into nurse_assignments(child_id, nurse_id, assigned_by) values (cid, auth.uid(), auth.uid());
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id) values (auth.uid(), 'nurse', 'CREATE_CHILD', cid, 'child_profiles', cid);
  return cid;
end $$;

-- Returns the readable code ONCE (format XXXXX-XXXXX). Only its hash is stored.
create function nurse_create_family_code(c uuid) returns text language plpgsql security definer set search_path=public as $$
declare raw text := gen_code(10);
begin
  if not is_nurse_of(c) then raise exception 'not authorized'; end if;
  insert into family_codes(child_id, nurse_id, code_hash) values (c, auth.uid(), hash_code(raw));
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table) values (auth.uid(), 'nurse', 'CREATE_FAMILY_CODE', c, 'family_codes');
  return substr(raw, 1, 5) || '-' || substr(raw, 6, 5);
end $$;

-- A caregiver enters the code. Returns the child id, or NULL for a wrong/used/expired code (failed tries are counted).
create function redeem_family_code(p text) returns uuid language plpgsql security definer set search_path=public as $$
declare fc family_codes;
begin
  if my_role() <> 'caregiver' then raise exception 'caregivers only'; end if;
  if (select count(*) from code_attempts where user_id = auth.uid() and at > now() - interval '15 minutes') >= 5 then
    raise exception 'too many attempts, try again later'; end if;
  select * into fc from family_codes f
   where f.code_hash = hash_code(p) and f.used_at is null and f.expires_at > now()
     and exists(select 1 from nurse_assignments n where n.child_id = f.child_id and n.nurse_id = f.nurse_id and n.active)
   for update;
  if not found then insert into code_attempts(user_id) values (auth.uid()); return null; end if;
  update family_codes set used_by = auth.uid(), used_at = now() where id = fc.id;
  insert into caregiver_relationships(child_id, caregiver_id, relationship, status, verified_by, verified_at)
  values (fc.child_id, auth.uid(), 'parent', 'active', fc.nurse_id, now())
  on conflict (child_id, caregiver_id) do update set status = 'active', verified_by = excluded.verified_by, verified_at = excluded.verified_at;
  delete from code_attempts where user_id = auth.uid();
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id) values (auth.uid(), 'caregiver', 'REDEEM_FAMILY_CODE', fc.child_id, 'family_codes', fc.id);
  return fc.child_id;
end $$;

create function nurse_revoke_caregiver(rel uuid) returns void language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  select child_id into cid from caregiver_relationships where id = rel;
  if cid is null or not is_nurse_of(cid) then raise exception 'not authorized'; end if;
  update caregiver_relationships set status = 'revoked' where id = rel;
end $$;

-- Second factor for the nursing dashboard (on top of normal sign-in). Rate-limited like family codes.
create function nurse_verify_code(p text) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if my_role() <> 'nurse' then return false; end if;
  if (select count(*) from code_attempts where user_id = auth.uid() and at > now() - interval '15 minutes') >= 5 then
    raise exception 'too many attempts, try again later'; end if;
  if exists(select 1 from profiles where id = auth.uid() and nurse_code = upper(trim(p))) then
    delete from code_attempts where user_id = auth.uid(); return true; end if;
  insert into code_attempts(user_id) values (auth.uid());
  return false;
end $$;

create function my_nurse_code() returns text language sql stable security definer set search_path=public as
$$ select nurse_code from profiles where id = auth.uid() and role = 'nurse' $$;

-- A caregiver or child can see the display name of the nurse linked to the child.
create function child_nurses(c uuid) returns table(display_name text) language sql stable security definer set search_path=public as
$$ select p.display_name from nurse_assignments n join profiles p on p.id = n.nurse_id
   where n.child_id = c and n.active and (is_caregiver_of(c) or is_child_self(c)) $$;

create function admin_verify_caregiver(rel uuid) returns void language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update caregiver_relationships set status='active', verified_by=auth.uid(), verified_at=now() where id = rel returning child_id into cid;
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id) values (auth.uid(), 'admin', 'VERIFY_CAREGIVER', cid, 'caregiver_relationships', rel);
end $$;

create function admin_link_child_user(cid uuid, uid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if (select role from profiles where id = uid) <> 'child' then raise exception 'target user must have role child'; end if;
  update child_profiles set user_id = uid where id = cid;
  insert into audit_logs(actor_id, actor_role, action, child_id) values (auth.uid(), 'admin', 'LINK_CHILD_USER', cid);
end $$;

create function admin_set_role(uid uuid, r user_role) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update profiles set role = r where id = uid;
  insert into audit_logs(actor_id, actor_role, action, detail) values (auth.uid(), 'admin', 'SET_ROLE', jsonb_build_object('user', uid, 'role', r));
end $$;

-- Admins manage assignments but must not read health data: they only see id + nickname.
create function admin_list_children() returns table(id uuid, nickname text, is_demo boolean)
language sql stable security definer set search_path=public as
$$ select c.id, c.nickname, c.is_demo from child_profiles c where is_admin() $$;

-- Deletion under the approved retention policy. Also delete the child's files in Storage via the API.
create function purge_child_data(cid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  perform set_config('uns.allow_purge', 'on', true);
  delete from child_profiles where id = cid;
  insert into audit_logs(actor_id, actor_role, action, child_id) values (auth.uid(), 'admin', 'PURGE_CHILD', cid);
end $$;

-- ---------- triggers ----------
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, display_name) values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 60), ''), 'User'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- No collection of child data without active caregiver authorization.
create function require_collection_consent() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not has_consent(new.child_id, 'data_collection') then raise exception 'caregiver consent required before collecting data'; end if;
  if TG_TABLE_NAME = 'memories' then
    if to_jsonb(new)->>'kind' = 'photo' and not has_consent(new.child_id, 'media_photos') then
      raise exception 'photo consent required'; end if;
  end if;
  return new;
end $$;
create trigger t_consent before insert on emotional_checkins for each row execute function require_collection_consent();
create trigger t_consent before insert on symptom_reports for each row execute function require_collection_consent();
create trigger t_consent before insert on saved_drawings for each row execute function require_collection_consent();
create trigger t_consent before insert on memories for each row execute function require_collection_consent();
create trigger t_consent before insert on wishes for each row execute function require_collection_consent();
create trigger t_consent before insert on child_preferences for each row execute function require_collection_consent();

-- Clinical and audit records cannot be edited or deleted (except through purge_child_data).
create function block_mutation() returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' and current_setting('uns.allow_purge', true) = 'on' and TG_TABLE_NAME <> 'audit_logs' then return old; end if;
  raise exception '% is append-only', TG_TABLE_NAME;
end $$;
create trigger t_immutable before update or delete on emotional_checkins for each row execute function block_mutation();
create trigger t_immutable before update or delete on symptom_reports for each row execute function block_mutation();
create trigger t_immutable before update or delete on nursing_notes for each row execute function block_mutation();
create trigger t_immutable before update or delete on consent_records for each row execute function block_mutation();
create trigger t_immutable before update or delete on report_reviews for each row execute function block_mutation();
create trigger t_immutable before update or delete on audit_logs for each row execute function block_mutation();

-- Little Signals: route a report to assigned nurses for HUMAN review. The rules below are a starting
-- point and MUST be configured with the supervising clinical team. They do not judge urgency.
-- A notification is never the only safety mechanism.
create function emit_signals() returns trigger language plpgsql security definer set search_path=public as $$
declare s signal_type[] := '{}'; x signal_type; n record;
begin
  if TG_TABLE_NAME = 'emotional_checkins' then
    if 'scared' = any(new.feelings) then s := s || 'feels_scared'::signal_type; end if;
    if new.asked_to_talk or 'nurse' = any(new.wanted_support) then s := s || 'wants_nurse'::signal_type; end if;
  else
    if coalesce(new.pain_score, 0) > 0 then s := s || 'reports_pain'::signal_type; end if;
    if new.pain_unable or 'need_help' = any(new.wants) then s := s || 'needs_help'::signal_type; end if;
    if 'tell_nurse' = any(new.wants) then s := s || 'wants_nurse'::signal_type; end if;
  end if;
  foreach x in array s loop
    for n in select nurse_id from nurse_assignments where child_id = new.child_id and active loop
      insert into notifications(recipient_id, child_id, signal, source_table, source_id) values (n.nurse_id, new.child_id, x, TG_TABLE_NAME, new.id);
    end loop;
  end loop;
  return new;
end $$;
create trigger t_signal after insert on emotional_checkins for each row execute function emit_signals();
create trigger t_signal after insert on symptom_reports for each row execute function emit_signals();

-- Metadata-only audit trail for sensitive writes (never copies report content).
create function audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table, target_id)
  values (auth.uid(), my_role(), TG_OP, (r->>'child_id')::uuid, TG_TABLE_NAME, (r->>'id')::uuid);
  return null;
end $$;
create trigger t_audit after insert or update or delete on consent_records for each row execute function audit_change();
create trigger t_audit after insert or update or delete on nursing_notes for each row execute function audit_change();
create trigger t_audit after insert or update or delete on nurse_assignments for each row execute function audit_change();
create trigger t_audit after insert or update or delete on caregiver_relationships for each row execute function audit_change();
create trigger t_audit after insert or update or delete on report_reviews for each row execute function audit_change();
create trigger t_audit after update or delete on wishes for each row execute function audit_change();
