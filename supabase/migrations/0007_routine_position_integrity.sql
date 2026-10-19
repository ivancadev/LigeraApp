-- Ligera migration 0007
-- 1) Remove routine days that a concurrent seed duplicated (same user_id +
--    position); keep the earliest row of each pair. Their routine_exercises
--    cascade away with them.
-- 2) Enforce one routine per (user_id, position) and one exercise row per
--    (routine_id, position) so the client seed can use upsert/on-conflict.
-- Run once in the Supabase SQL Editor.

-- Deduplicate routines, keeping the oldest row per (user_id, position).
delete from public.routines r
using (
  select id,
         row_number() over (partition by user_id, position order by created_at, id) as rn
  from public.routines
) d
where r.id = d.id
  and d.rn > 1;

-- Guard against future duplicates (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routines_user_position_key'
  ) then
    alter table public.routines
      add constraint routines_user_position_key unique (user_id, position);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'routine_exercises_routine_position_key'
  ) then
    alter table public.routine_exercises
      add constraint routine_exercises_routine_position_key unique (routine_id, position);
  end if;
end $$;
