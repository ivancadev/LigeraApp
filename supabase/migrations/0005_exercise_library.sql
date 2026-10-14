-- Ligera migration 0005
-- 1) Per-user exercise library (custom + seeded exercise names, with muscle group).
-- 2) rename_exercise RPC that atomically propagates a rename to routines and history.
-- Run this in the Supabase SQL Editor. Run once (create policy is not re-runnable).

-- ---------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists exercises_user_name_idx
  on public.exercises (user_id, lower(name));

create index if not exists exercises_user_pos_idx
  on public.exercises (user_id, position);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.exercises enable row level security;

create policy "exercises_select_own"
  on public.exercises for select
  to authenticated
  using (auth.uid() = user_id);

create policy "exercises_insert_own"
  on public.exercises for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "exercises_update_own"
  on public.exercises for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exercises_delete_own"
  on public.exercises for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- rename_exercise: rename across library, routines and history
-- ---------------------------------------------------------------
create or replace function public.rename_exercise(p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_old is null or p_new is null or length(trim(p_new)) = 0 then
    raise exception 'Invalid exercise name';
  end if;

  update public.routine_exercises re
     set name = trim(p_new)
    from public.routines r
   where re.routine_id = r.id
     and r.user_id = auth.uid()
     and re.name = p_old;

  update public.workout_exercises we
     set name = trim(p_new)
    from public.workouts w
   where we.workout_id = w.id
     and w.user_id = auth.uid()
     and we.name = p_old;

  update public.exercises e
     set name = trim(p_new)
   where e.user_id = auth.uid()
     and e.name = p_old;
end;
$$;
