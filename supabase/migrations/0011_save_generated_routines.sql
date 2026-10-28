-- Ligera migration 0011
-- Atomic save of AI-generated routine tables (spec 009).
-- Run once in the Supabase SQL Editor.

create or replace function public.save_generated_routines(
  p_days jsonb,
  p_mode text default 'append'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mode_value text := coalesce(nullif(btrim(p_mode), ''), 'append');
  start_pos integer;
  day_json jsonb;
  ex_json jsonb;
  day_id uuid;
  day_index integer := 0;
  ex_index integer;
  ex_name text;
  ex_group text;
  ex_sets integer;
  ex_reps_min integer;
  ex_reps_max integer;
  ex_rir text;
  ex_note text;
  ex_bodyweight boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if mode_value not in ('append', 'replace') then
    raise exception 'Invalid mode';
  end if;

  if p_days is null or jsonb_typeof(p_days) is distinct from 'array' then
    raise exception 'p_days must be a JSON array';
  end if;

  if jsonb_array_length(p_days) < 1 or jsonb_array_length(p_days) > 7 then
    raise exception 'p_days must contain 1-7 days';
  end if;

  if mode_value = 'replace' then
    delete from public.routines where user_id = uid;
    start_pos := 0;
  else
    select coalesce(max(position) + 1, 0)
      into start_pos
      from public.routines
     where user_id = uid;
  end if;

  for day_json in select value from jsonb_array_elements(p_days)
  loop
    if jsonb_typeof(day_json) is distinct from 'object' then
      raise exception 'Invalid day';
    end if;

    if nullif(btrim(coalesce(day_json ->> 'title', '')), '') is null then
      raise exception 'Day title required';
    end if;

    if jsonb_typeof(day_json -> 'exercises') is distinct from 'array' then
      raise exception 'Day exercises must be an array';
    end if;

    if jsonb_array_length(day_json -> 'exercises') < 1
       or jsonb_array_length(day_json -> 'exercises') > 15 then
      raise exception 'Day must contain 1-15 exercises';
    end if;

    insert into public.routines (user_id, title, position)
    values (uid, left(btrim(day_json ->> 'title'), 100), start_pos + day_index)
    returning id into day_id;

    ex_index := 0;
    for ex_json in select value from jsonb_array_elements(day_json -> 'exercises')
    loop
      if jsonb_typeof(ex_json) is distinct from 'object' then
        raise exception 'Invalid exercise';
      end if;

      ex_name := btrim(coalesce(ex_json ->> 'name', ''));
      if ex_name = '' or length(ex_name) > 80 then
        raise exception 'Invalid exercise name';
      end if;

      ex_group := nullif(btrim(coalesce(ex_json ->> 'muscleGroup', '')), '');
      if ex_group is null or ex_group not in (
        'Pecho',
        'Espalda',
        'Hombros',
        'Bíceps',
        'Tríceps',
        'Cuádriceps',
        'Isquiotibiales',
        'Glúteos',
        'Gemelos',
        'Core',
        'Otros'
      ) then
        raise exception 'Invalid muscle group';
      end if;

      ex_sets := coalesce((ex_json ->> 'sets')::integer, 3);
      ex_reps_min := coalesce((ex_json ->> 'repsMin')::integer, 8);
      ex_reps_max := coalesce((ex_json ->> 'repsMax')::integer, ex_reps_min);

      if ex_sets < 1 or ex_sets > 10 then
        raise exception 'Invalid sets';
      end if;
      if ex_reps_min < 1 or ex_reps_min > 50 then
        raise exception 'Invalid reps';
      end if;
      if ex_reps_max < ex_reps_min or ex_reps_max > 50 then
        raise exception 'Invalid reps';
      end if;

      ex_rir := coalesce(nullif(btrim(coalesce(ex_json ->> 'rir', '')), ''), '1');
      if length(ex_rir) > 12 then
        ex_rir := left(ex_rir, 12);
      end if;

      ex_note := nullif(left(btrim(coalesce(ex_json ->> 'note', '')), 200), '');
      ex_bodyweight := coalesce((ex_json ->> 'bodyweight')::boolean, false);

      insert into public.routine_exercises (
        routine_id,
        name,
        sets,
        reps_min,
        reps_max,
        rir,
        note,
        bodyweight,
        position
      )
      values (
        day_id,
        ex_name,
        ex_sets,
        ex_reps_min,
        ex_reps_max,
        ex_rir,
        ex_note,
        ex_bodyweight,
        ex_index
      );

      insert into public.exercises (user_id, name, muscle_group, position)
      values (
        uid,
        ex_name,
        ex_group,
        coalesce((select max(position) + 1 from public.exercises where user_id = uid), 0)
      )
      on conflict (user_id, lower(name)) do update
        set muscle_group = coalesce(public.exercises.muscle_group, excluded.muscle_group);

      ex_index := ex_index + 1;
    end loop;

    day_index := day_index + 1;
  end loop;
end;
$$;

revoke execute on function public.save_generated_routines(jsonb, text) from public, anon;
grant execute on function public.save_generated_routines(jsonb, text) to authenticated, service_role;
