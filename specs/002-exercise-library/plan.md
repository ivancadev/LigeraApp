# 002 — Exercise library, rename & pickers (plan)

**Spec:** `specs/002-exercise-library/spec.md`
**Constitution refs:** §3.5, §3.6, §3.7, §3.9

## Files touched

- `supabase/migrations/0005_exercise_library.sql` (new).
- `lib/exercises.ts` (new) — data hook + CRUD, mirrors `lib/routines.ts`.
- `lib/muscles.ts` (spec 004) — seeded groups used when creating rows.
- `components/exercise-picker.tsx` — accept a names list; optional manage mode.
- `components/routines-screen.tsx` — pass library names; rename via RPC.
- `components/workout-screen.tsx` / `edit-workout-screen.tsx` — pass names.

## Design

```ts
export const EXERCISES_CHANGED = 'ligera:exercises-changed'
export type ManagedExercise = { id: string; name: string; muscleGroup: MuscleGroup | null; position: number }
export function useExercises(): ManagedExercise[]
export async function createExercise(userId, name, muscleGroup?)
export async function renameExercise(oldName, newName)  // RPC
export async function setMuscleGroup(id, group)
```

- `ensureSeeded(userId)` mirrors `routines.ts::ensureSeeded`: if the user has zero
  library rows, insert `exerciseOptions` with `EXERCISE_MUSCLE`.
- Pickers receive `names: string[]` (library ∪ logged names). A small pencil on a
  custom chip opens inline rename + muscle-group select.
- Routine-exercise rename: when the edit form changes the name, call
  `renameExercise(old, new)` (RPC) and update the other fields via
  `updateRoutineExercise`.

## Migration `0005_exercise_library.sql`

- `create table if not exists public.exercises (id, user_id, name, muscle_group,
  position, created_at)`.
- `create unique index ... on (user_id, lower(name))`; index on `(user_id, position)`.
- Enable RLS + owner-only select/insert/update/delete policies.
- `rename_exercise(p_old text, p_new text)` `security definer`,
  `set search_path = public`, `auth.uid()` checks, updates the three tables.
- Manual paste required (constitution §3.9); handed to the user verbatim.

## Risks / tradeoffs

- Existing custom routine/workout names are not retroactively added to the library;
  they still appear via the logged-names union, and get library rows the next time
  they are added.
- Concurrent first-fetch seeding could double-insert; guarded by the unique index.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
