# 005 — Routine name in history (plan)

**Spec:** `specs/005-history-routine-name/spec.md`
**Constitution refs:** §3.1, §3.4, §3.5

## Files touched

- `supabase/migrations/0006_workout_name.sql` (new) — `workouts.name` + RPC params.
- `lib/data.ts` — `Workout.name`, select it, pass `p_name` on save/update.
- `lib/session.ts` — persist `name` in `SessionState`.
- `components/workout-screen.tsx` — `sessionName` state wired to `startDay`/save.
- `components/history-screen.tsx` — show the name (fallback `Entrenamiento libre`).
- `components/edit-workout-screen.tsx` — carry the existing name through updates.
- `docs/SUPABASE.md`, `AGENTS.md`, `docs/ROADMAP.md` — document the column.

## Design

Migration `0006_workout_name.sql`:

```sql
alter table public.workouts add column if not exists name text;
```

Recreate both RPCs with an extra trailing `p_name text default null`:
- `log_workout(p_user_id, p_date, p_elapsed, p_exercises, p_name)` → insert `name`.
- `update_logged_workout(p_workout_id, p_elapsed, p_exercises, p_name)` →
  `set name = coalesce(p_name, name)` (an edit without a name keeps the old one).
Recreating is required because Postgres cannot add a parameter with `create or
replace` (signature change) — the script drops then creates the function.

TS changes:

```ts
export type Workout = { id; date; elapsedSeconds; name?: string | null; exercises }
```

- `fetchWorkouts` selects `name`.
- `saveWorkout` sends `p_name: workout.name ?? null`.
- `updateWorkout` gains an optional `name: string | null` argument.
- `session.ts` `SessionState` gains `name: string | null` (validated in
  `loadSession`, defaults to `null`).
- `workout-screen.tsx`: `const [sessionName, setSessionName] = useState<string |
  null>(null)`; `startDay(day)` sets `day.title`; `commit()` passes `sessionName`;
  `discardSession()` resets it; the hydration/persist effect includes it.
- `history-screen.tsx`: title line `{w.name ?? 'Entrenamiento libre'}` and the
  date/time moves to the secondary line.
- `edit-workout-screen.tsx`: keep the workout's `name` when calling `updateWorkout`.

## Risks / tradeoffs

- Snapshot means a later routine rename won't retro-label old sessions — intended.
- `Entrenamiento libre` is Spanish inside otherwise-English chrome; user-approved.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
