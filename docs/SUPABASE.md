# Supabase — how it is wired

Reference for everything database / auth related in Ligera.

## Applying migrations (manual)

There is **no supabase CLI linkage** in this repo. Migrations are SQL files in
`supabase/migrations/` that the user pastes into the
[Supabase SQL Editor](https://supabase.com/dashboard) and runs by hand.

1. Open the project → **SQL Editor**.
2. Paste the full contents of the migration file.
3. Run it.
4. Confirm no errors.

Migrations are ordered by number and are safe to re-run (all `create` / `alter`
statements below are idempotent or guarded).

### `0001_init.sql`

Core schema. Run first. Creates:

- `profiles` (user_id unique → auth.users, username)
- `workouts` (user_id, date, elapsed_seconds)
- `workout_exercises` (workout_id FK, name, position)
- `workout_sets` (exercise_id FK, kg numeric(6,1), reps, position)
- `pgcrypto` extension (UUID gen)
- Enables **RLS** on all four tables
- Policies: profiles readable by any authenticated user (competition prep),
  owner-updatable; workouts/exercises/sets owner-only on every operation
  (`auth.uid()` checks up the parent chain)
- `handle_new_user()` trigger → auto-creates a profile on signup

### `0002_rir.sql`

Adds the per-set effort field for the workout log:

```sql
alter table public.workout_sets
  add column if not exists rir smallint;
```

`rir` is nullable, range 0–3 (0 = to failure, higher = easier). RLS-passthrough:
the db is the seed of truth for values.

### `0003_routines.sql`

Editable per-user routine templates + atomic workout save:

- `routines` (user_id, title, position) and `routine_exercises`
  (routine_id FK, name, sets, reps_min, reps_max, rir text, note, bodyweight,
  position), both RLS **owner-only** (exercises resolve ownership through the
  parent routine).
- `log_workout(user_id, date, elapsed, exercises jsonb)` — a `security definer`
  RPC that inserts a workout, its exercises and all sets in **one transaction**
  (guards `user_id = auth.uid()` and that `exercises` is a JSON array).
  The browser client calls it via `supabase.rpc('log_workout', …)` from
  `saveWorkout` in `lib/data.ts`.

> Note: like `0001`, the `create policy` statements are not re-runnable. Run each
> migration file exactly once — matching how `0001`/`0002` were applied.

### `0004_edit_workout.sql`

`update_logged_workout(workout_id, elapsed, exercises jsonb)` — a `security definer`
RPC that re-checks ownership, optionally overrides `elapsed_seconds`, then replaces
the workout's exercises/sets in **one transaction**, preserving the workout id and
date. `updateWorkout` in `lib/data.ts` calls it; `EditWorkoutScreen` drives it.

### `0005_exercise_library.sql`

Per-user exercise library + rename propagation:

- `exercises` (user_id, name, muscle_group, position), RLS **owner-only** on every
  operation, unique `(user_id, lower(name))`. Seeded from the 25 defaults on first
  fetch (`lib/exercises.ts::ensureSeeded`). `useExercises()` is the source of truth
  and refreshes on the `ligera:exercises-changed` event.
- `rename_exercise(p_old, p_new)` — a `security definer` RPC that atomically
  rewrites the name in `routine_exercises`, `workout_exercises` and `exercises`,
  scoped to `auth.uid()`. Raises on empty name or unique-name conflict.

### `0006_workout_name.sql`

Adds a routine-day snapshot to each session:

- `workouts.name text` (nullable) — the routine day `title` at save time, or `null`
  for a manual session (UI renders `Entrenamiento libre`). It is a **snapshot**, not
  an FK, so renaming/deleting the source routine never rewrites history.
- Recreates `log_workout(…, p_name text default null)` and
  `update_logged_workout(…, p_name text default null)` to carry the name (the edit
  RPC keeps the old name when `p_name` is empty). Both functions are dropped and
  re-created because their signature changes (`create or replace` cannot add a
  parameter).

## Row Level Security reference

| operation      | profiles                        | workouts / exercises / sets, routines / routine_exercises, exercises |
| -------------- | ------------------------------- | ------------------------------------ |
| `select`       | any authenticated user          | owner only                           |
| `insert`       | — (trigger on signup)           | owner only (`user_id` / parent chain)|
| `update`       | owner only                      | owner only                           |
| `delete`       | —                               | owner only (cascade)                 |

All child-table policies resolve ownership through the parent row
(`workouts` or `routines`): `exists (select 1 from <parent> p where p.id = <fk> and p.user_id = auth.uid())`.

## Env vars (`.env.local`, gitignored)

| var                     | required | purpose                                  |
| ----------------------- | -------- | ---------------------------------------- |
| `SUPABASE_URL`          | yes      | project API URL                          |
| `SUPABASE_ANON_KEY`     | yes      | browser client (public by design)        |

Mirrored in `.env.example` so agents/tools know the required set.

## MCP servers (for AI tooling, optional)

Configured in `opencode.json` under `mcp`, all **disabled by default** so a missing
token never breaks startup. To enable, set the env vars below, then flip `enabled` to
`true` in the config.

| server      | env vars needed                                             | note                                    |
| ----------- | ----------------------------------------------------------- | --------------------------------------- |
| `supabase-db` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`            | official server, project-scoped        |
| `postgres`  | `DATABASE_URL`                                              | direct Postgres connection              |
| `github`    | `GITHUB_PERSONAL_ACCESS_TOKEN`                              | for PR / issues / deploy tooling        |
| `vercel`    | none (OAuth at `https://mcp.vercel.com`)                    | remote, beta — enable only if needed    |

Where to get each token:

- **Supabase PAT**: dashboard → Account → Access Tokens.
- **Project ref**: dashboard → project → Settings → API, the subdomain prefix
  (e.g. `abcxyz`) or from the `SUPABASE_URL` host (`https://<ref>.supabase.co`).
- **DATABASE_URL**: project → Settings → Database → connection string + password.
- **GitHub PAT**: github.com → Settings → Developer settings → PAT (classic, `repo` scope).
- Vercel uses its own OAuth; needs interactive browser sign-in.

Never commit tokens. They enter config via `{env:VAR}` interpolation.