-- UNS backend, part 8: body-map marks on symptom reports (My Health).
-- Additive: one new nullable column plus a validation trigger. Existing reports and data are untouched. Safe to run twice.
-- Order: after 01, 02, 05 (and 07). Back up first.
-- The marks are what the child drew on the body figure (where it hurts). A communication aid only: stored as small vectors on a 0-1000 grid,
-- not as an image, never interpreted, and never used to decide urgency.
-- Size: at most 600 points in all (about 8 KB as text, about 19 KB as stored jsonb); the 32 KB limit below is only a backstop.
alter table symptom_reports add column if not exists body_marks jsonb;
create or replace function validate_body_marks() returns trigger language plpgsql as $$
declare v text; st jsonb; pt jsonb; total int := 0;
begin
  if new.body_marks is null then return new; end if;
  if jsonb_typeof(new.body_marks) <> 'object' or pg_column_size(new.body_marks) > 32000 then raise exception 'invalid body marks'; end if;
  if exists (select 1 from jsonb_object_keys(new.body_marks) k where k not in ('v','fig','front','back')) then raise exception 'unknown body mark field'; end if;
  if new.body_marks->'v' is distinct from '1'::jsonb then raise exception 'unsupported body marks version'; end if;
  if coalesce(new.body_marks->>'fig','') not in ('7-8','9-10','11-12') then raise exception 'invalid figure'; end if;
  foreach v in array array['front','back'] loop
    if coalesce(jsonb_typeof(new.body_marks->v),'') <> 'array' or jsonb_array_length(new.body_marks->v) > 40 then raise exception 'invalid strokes'; end if;
    for st in select e from jsonb_array_elements(new.body_marks->v) e loop
      if jsonb_typeof(st) <> 'array' or jsonb_array_length(st) not between 1 and 120 then raise exception 'invalid stroke'; end if;
      total := total + jsonb_array_length(st);
      for pt in select e from jsonb_array_elements(st) e loop
        if jsonb_typeof(pt) <> 'array' or jsonb_array_length(pt) <> 2 or jsonb_typeof(pt->0) <> 'number' or jsonb_typeof(pt->1) <> 'number'
           or (pt->>0)::numeric not between 0 and 1000 or (pt->>1)::numeric not between 0 and 1000 then raise exception 'invalid point'; end if;
      end loop;
    end loop;
  end loop;
  if total > 600 then raise exception 'too many points'; end if;
  return new;
end $$;
drop trigger if exists t_body_marks on symptom_reports;
create trigger t_body_marks before insert on symptom_reports for each row execute function validate_body_marks();
