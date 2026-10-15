-- ---------------------------------------------------------------
-- 0006_workout_name: snapshot of the routine day on each session
-- Adds workouts.name (text snapshot, no FK) and extends the save/
-- edit RPCs with a trailing p_name parameter. Snapshot so renaming
-- or deleting the source routine never changes past sessions.
-- Run once in the Supabase SQL Editor.
-- ---------------------------------------------------------------

alter table public.workouts add column if not exists name text;

-- ---------------------------------------------------------------
-- log_workout: atomic save of a whole session (now with a name)
-- ---------------------------------------------------------------
drop function if exists public.log_workout(uuid, timestamptz, integer, jsonb);

create or replace function public.log_workout(
  p_user_id uuid,
  p_date timestamptz default now(),
  p_elapsed integer default 0,
  p_exercises jsonb default '[]'::jsonb,
  p_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w_id uuid;
  ex record;
  ex_id uuid;
  set_json jsonb;
  i int;
  j int;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden: workout does not belong to the signed-in user';
  end if;

  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' then
    raise exception 'p_exercises must be a JSON array';
  end if;

  insert into public.workouts (user_id, date, elapsed_seconds, name)
  values (p_user_id, p_date, p_elapsed, nullif(btrim(coalesce(p_name, '')), ''))
  returning id into w_id;

  i := 0;
  for ex in
    select value from jsonb_array_elements(p_exercises)
  loop
    insert into public.workout_exercises (workout_id, name, position)
    values (w_id, ex.value ->> 'name', i)
    returning id into ex_id;

    j := 0;
    for set_json in
      select value from jsonb_array_elements(coalesce(ex.value -> 'sets', '[]'::jsonb))
    loop
      insert into public.workout_sets (exercise_id, kg, reps, rir, position)
      values (
        ex_id,
        (set_json ->> 'kg')::numeric,
        (set_json ->> 'reps')::integer,
        (set_json ->> 'rir')::smallint,
        j
      );
      j := j + 1;
    end loop;

    i := i + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- update_logged_workout: atomic edit (now can carry the name)
-- An edit without a name keeps the existing one.
-- ---------------------------------------------------------------
drop function if exists public.update_logged_workout(uuid, integer, jsonb);

create or replace function public.update_logged_workout(
  p_workout_id uuid,
  p_elapsed integer default null,
  p_exercises jsonb default '[]'::jsonb,
  p_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ex record;
  ex_id uuid;
  set_json jsonb;
  i int;
  j int;
begin
  if not exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and w.user_id = auth.uid()
  ) then
    raise exception 'Forbidden: workout does not belong to the signed-in user';
  end if;

  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' then
    raise exception 'p_exercises must be a JSON array';
  end if;

  update public.workouts
     set elapsed_seconds = coalesce(p_elapsed, elapsed_seconds),
         name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name)
   where id = p_workout_id;

  delete from public.workout_exercises
   where workout_id = p_workout_id;

  i := 0;
  for ex in
    select value from jsonb_array_elements(p_exercises)
  loop
    insert into public.workout_exercises (workout_id, name, position)
    values (p_workout_id, ex.value ->> 'name', i)
    returning id into ex_id;

    j := 0;
    for set_json in
      select value from jsonb_array_elements(coalesce(ex.value -> 'sets', '[]'::jsonb))
    loop
      insert into public.workout_sets (exercise_id, kg, reps, rir, position)
      values (
        ex_id,
        (set_json ->> 'kg')::numeric,
        (set_json ->> 'reps')::integer,
        (set_json ->> 'rir')::smallint,
        j
      );
      j := j + 1;
    end loop;

    i := i + 1;
  end loop;
end;
$$;
