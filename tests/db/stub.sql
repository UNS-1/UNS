-- Minimal stand-ins for Supabase's auth/storage so the schema can be tested on plain PostgreSQL 14+.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth; create schema storage;
create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
grant usage on schema auth, storage, public to authenticated, anon;
grant execute on function auth.uid(), auth.jwt() to authenticated;
-- test helper: assert that a statement fails
create function public.t_fails(q text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute q; exception when others then failed := true; end;
  if not failed then raise exception 'EXPECTED AN ERROR BUT NONE OCCURRED: %', q; end if;
end $$;
grant execute on function public.t_fails(text) to authenticated, anon;
create function public.t_assert(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'ASSERTION FAILED: %', msg; end if; end $$;
grant execute on function public.t_assert(boolean, text) to authenticated;
