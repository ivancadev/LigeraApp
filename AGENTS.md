# AGENTS.md — Project memory for Ligera

Everything an agent needs to work on this repo without re-discovering context.
Keep this file up to date whenever the stack, architecture, or conventions change.

## What is Ligera

A mobile-first workout tracker (PWA) for **Ivar's** 5-day advanced training
routine. The app lets the user:

- Start an editable routine template (per-user, seeded from the 5 default days), or add exercises by hand
- Log each set with kg / reps / RIR; mark sets complete
- Save sessions to Supabase atomically via the `log_workout` RPC (online-only, no offline cache)
- Review past workouts (History) and long-term strength trends (Progress)

> Product north star (deferred, not implemented): friend-to-friend competition
> (weekly volume leaderboards). The schema was normalized with this in mind.

## Spec-first development (constitution)

**`docs/constitution.md` is the absolute source of truth.** If any code, spec,
comment, plan or instruction conflicts with it, the constitution wins. Read it
before starting any work.

All non-trivial work follows a spec-driven flow:

```
constitution.md  →  specs/NNN-feature/spec.md  →  plan.md  →  tasks.md  →  code
```

- Write the spec **before** the code. A spec may not contradict the constitution.
- Templates: `specs/0000-template/`. Pick the next free `NNN`.
- Keep the spec current when a feature changes (same change).
- The constitution changes only by explicit, user-approved amendment.

Shipped specs: `001-progression-summary`, `002-exercise-library`,
`003-lock-completed-sets`, `004-muscle-group-progress`,
`005-history-routine-name`, `006-muscle-groups`,
`007-ai-coach` (classification only; plateau coaching deferred).

## Stack

- **Next.js** 16 (App Router), **React** 19, **TypeScript** 5.7
- **Tailwind CSS** v4 + **shadcn/ui** primitives in `components/ui/`
- **Recharts** (progress chart)
- **lucide-react** icons
- **Supabase**: `@supabase/supabase-js` + `@supabase/ssr` (auth + Postgres)
- **pnpm** package manager (v12+)

## Commands

```bash
pnpm dev            # local dev server
pnpm build          # production build (this is the deploy gate)
pnpm exec tsc --noEmit  # typecheck (fast; there is no lint script)
```

There is **no `lint` script**. Verify with `tsc --noEmit` + `pnpm build`.

## Architecture

```
app/
  layout.tsx      root layout: fonts, metadata, viewport, PWA manifest/sw
  page.tsx        session gate; tab router (workout/routines/history/progress)
  api/classify-exercise/route.ts  server-only AI exercise classification
  globals.css     Tailwind v4 entry
proxy.ts          root middleware replaced by this proxy (Next 16, refreshed-cookies session)
components/       client UI screens + shared controls
  ui/             shadcn/ui primitives (button, input, ...)
lib/
  auth.ts         shared session store + useSession/useUserId/useProfile, signUp/signIn/signOut
  data.ts         Workout types, fetchWorkouts, saveWorkout (RPC), deleteWorkout/Exercise, useWorkouts
  routines.ts     editable routine days: fetch/seed, CRUD, useRoutines
  exercises.ts    per-user exercise library: fetch/seed, CRUD, renameExercise (RPC), useExercises, buildPickerOptions
  muscles.ts      muscle groups, exercise→group map, muscleGroupFor
  stats.ts        Epley 1RM, PRs, lastBestSet, exerciseProgress, muscleGroupStats, filters
  workout-data.ts exerciseOptions, defaultRoutineDays (seed), target helpers, DraftSet/DraftExercise
  load-failure.ts store of load failures + reportLoadFailure/clearLoadFailure (drives DataErrorBanner)
  ai.ts           classifyExercise client helper (timeout + null fallback) for the classify route
  supabase/
    client.ts     browser Supabase client (singleton)
    server.ts     server client via cookies
    middleware.ts updateSession helper consumed by root proxy.ts
supabase/migrations/   SQL migrations (0001_init, 0002_rir, 0003_routines, 0004_edit_workout, 0005_exercise_library, 0006_workout_name, 0007_routine_position_integrity, 0008_function_grants, 0009_ai_requests)
scripts/generate-icons.mjs  pure-Node PNG icon generator (no deps)
public/           manifest.json, sw.js, icons/
docs/             constitution.md, ROADMAP.md, SUPABASE.md
specs/            spec-first feature specs (0000-template, 001..007 shipped)
```

Screens are interchangeable views rendered inside `app/page.tsx`, switched by
`BottomNav` (`components/bottom-nav.tsx`, 4 tabs: Workout · Routines · History · Progress).

## Data model (Postgres via Supabase)

- `profiles` — user_id (unique → auth.users), username. Auto-created by trigger on signup.
- `workouts` — user_id, date, elapsed_seconds, **name text nullable (snapshot of the routine day / null for manual → UI shows `Entrenamiento libre`)**
- `workout_exercises` — workout_id (FK), name, position
- `workout_sets` — exercise_id (FK), kg numeric(6,1), reps int, position, **rir smallint nullable (0–3)**
- `routines` — user_id, title, position (editable routine days, seeded per user, unique `(user_id, position)`)
- `routine_exercises` — routine_id (FK), name, sets, reps_min, reps_max, rir text, note, bodyweight, position, unique `(routine_id, position)`
- `exercises` — user_id, name, muscle_group, position (per-user exercise library, seeded per user, unique `(user_id, lower(name))`)
- `ai_requests` — user_id, kind, created_at (AI classification quota; **never** stores the exercise name)

All cascade on delete. **RLS enabled** on every table:
- profiles: any authenticated user may **read** usernames (for the planned competition), owner can update.
- workouts/exercises/sets, routines/routine_exercises and exercises library: **owner-only** on every operation (checks `auth.uid()` up the parent chain).
- ai_requests: owner-only `select`; inserts only via the `consume_ai_quota` RPC (no direct write policies).
- Function `EXECUTE` (migrations `0008`/`0009`): the `log_workout`, `update_logged_workout`, `rename_exercise` and `consume_ai_quota` RPCs are granted to `authenticated` only (revoked from `public`/`anon`); `handle_new_user` (signup trigger) is granted to `supabase_auth_admin` only. They are `SECURITY DEFINER` and re-check `auth.uid()`.

See `docs/SUPABASE.md` for applying migrations and the RLS reference.

## Auth flow

- Browser Supabase session stored in cookies via `@supabase/ssr`.
- `proxy.ts` refreshes the session on route access.
- `lib/auth.ts` exposes hooks from a single module-level session store
  (`useSyncExternalStore`): one `getSession()` + one `onAuthStateChange` shared by
  every `useSession`/`useUserId` consumer. The anon key in `.env.local` is public
  by design (never use the service-role key client-side).
- `app/page.tsx` gates: loading → `AuthScreen` → app, and mounts `<DataErrorBanner />`.

## Save / refresh model (important)

`useWorkouts()` is the single source of truth for logged data across screens.
It refreshes on mount, on auth change, **and** on a window event
`ligera:workouts-changed`. Every mutation (`saveWorkout`, `deleteWorkout`,
`deleteExercise`) must dispatch that event afterwards or other screens go stale.

Sessions are saved atomically via the `log_workout` RPC (single transaction in
Postgres); `saveWorkout` in `lib/data.ts` calls `supabase.rpc('log_workout', …)`.
Past sessions are edited in place via the `update_logged_workout` RPC (migration
`0004_edit_workout.sql`): it re-checks ownership, optionally overrides
`elapsed_seconds`, then replaces the workout's exercises/sets in one transaction,
preserving the workout id and date. `updateWorkout` in `lib/data.ts` calls it,
and `EditWorkoutScreen` (opened from History) drives it.

The in-progress session (draft exercises + timer) is persisted to `localStorage`
via `lib/session.ts` (key `ligera:session`, keyed per user) on every change, so it
survives tab switches and reloads; it is cleared on save or discard. The workout
timer auto-starts when the first exercise is added, shows `00:00:00` beforehand,
and supports pause/resume from a header button (`startedAt`/`accumulated` model).
The draft also carries the routine-day `name` snapshot (set by `startDay`, `null`
after manual starts); it is saved on the workout and shown in History.

`useRoutines()` (in `lib/routines.ts`) is the source of truth for editable
routine days. It seeds the 5 defaults on first fetch and refreshes on the
`ligera:routines-changed` event; every routine CRUD must dispatch that event.
Seeding is **idempotent**: the insert is an upsert with `ignoreDuplicates` backed
by the `(user_id, position)` / `(routine_id, position)` unique constraints (migration
`0007`), so two concurrent seeds cannot duplicate a day. New routine days and
routine exercises take `position = max + 1`.

`useExercises()` (in `lib/exercises.ts`) is the source of truth for the per-user
exercise library. It seeds the 25 defaults (with muscle groups) on first fetch and
refreshes on the `ligera:exercises-changed` event. Seeding is also idempotent
(ignores the `23505` unique violation from `(user_id, lower(name))`). Renames go
through the `rename_exercise` RPC, which propagates to `routine_exercises` and
`workout_exercises`; `renameExercise` therefore dispatches the exercises, routines
and workouts changed events. `buildPickerOptions(library, extraNames)` builds the
picker list (library ∪ logged/routine names), falling back to `exerciseOptions`
while the library is still empty.

## AI exercise classification (spec 007)

`ExercisePicker` shows a `Suggest with AI` button for unknown names. It calls
`classifyExercise` (`lib/ai.ts`) → `POST /api/classify-exercise` with `{ name }`.
The route authenticates with the server Supabase client, consumes the per-user
daily quota via `consume_ai_quota` (migration `0009`), then calls Google Gemini
(default `gemini-3.1-flash-lite`, override with `GEMINI_MODEL`) and validates the
returned group against `MUSCLE_GROUPS`. Only the exercise name leaves the device
and it is never logged or stored. Any failure returns `null`, so the manual group
picker keeps working. Requires the server-only `GEMINI_API_KEY`; optional
`AI_DAILY_LIMIT` (default 20). Plateau coaching is **not** implemented.

## Conventions

- **Language**: exercise names, routine days, and target text are in **Spanish**
  (they come from the user's training plan). All UI chrome/labels are in **English**.
- **Theme**: dark only. Layout is a phone frame: `max-w-md`, `min-h-svh`,
  bottom nav, sticky headers with `backdrop-blur`.
- kg steppers use 2.5 kg increments, 0.1 precision; reps 1, integer.
- Estimated 1RM uses the **Epley** formula: `kg * (1 + reps/30)`.
- `Intl.NumberFormat('en-US')` for big numbers (kg values keep their own decimals).
- No code comments unless asked. Keep components small and typed.
- Migrations live in `supabase/migrations/`, ordered `NNNN_name.sql`. The baseline
  `0001`–`0006` is recorded in `supabase_migrations.schema_migrations` (there is no
  supabase CLI linkage). New migrations are applied with the Supabase MCP
  (`apply_migration`) **and** always communicated to the user with the exact SQL to paste.

## Deploy

- **Vercel**, wired to GitHub: pushing to `main` auto-deploys.
- Remote: `origin` → `https://github.com/ivardev33/LigeraApp.git`.
- The user reviews before commit/push. Never commit or push unless explicitly told.

## Dotfiles / config

- `opencode.json` at the repo root (schema, MCP servers, no secrets — secrets come
  in via `{env:VAR}`). It wires the remote Supabase MCP `conexion-supabase2`
  (`https://mcp.supabase.com/mcp?project_ref=…`, OAuth, read-only) used by the dba.
- `.opencode/agents/*.md` defines specialized subagents (dba, workout-domain,
  deploy, optimizador). `.opencode/` is committed (its `node_modules` is ignored).
- `.env.local` holds `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ `GEMINI_API_KEY` for
  AI classification) and is gitignored.
- `.env.example` documents every env var an agent/tool may need.
- After changing opencode config or agents, tell the user to **restart opencode**.

## Cross-cutting helpers

- `targetText(te)` → shown on cards (e.g. `4 × 5–7 · RIR 1.5–2`).
- `shouldProgress(workouts, name, repsMax)` → true when the last session hit the
  top of the target rep range on every set (progressive overload hint).
- `exerciseNameOptions(workouts)` → includes old logged names so they persist in pickers.
- `exerciseProgress(workouts, name)` → last session date + sets, kg delta vs the
  previous session, and a PR flag (rendered on exercise cards).
- `muscleGroupFor(name, overrides)` (`lib/muscles.ts`) → muscle group via seeded
  map → keyword heuristic → library override, else `Otros`.
- `DISPLAY_GROUPS` / `ROLLUP` (`lib/muscles.ts`) → what the Progress group view
  lists; `Pierna` is a display-only rollup of Cuádriceps+Isquiotibiales+Glúteos+
  Gemelos (never assigned to an exercise). `isRecognizedGroup()` drives the
  picker's "which group?" prompt for unknown names.
- `muscleGroupStats` / `groupVolumeByWorkout` (`lib/stats.ts`) → per-group volume
  (kg×reps) and hard-set counts for the Progress "By muscle group" view; both
  return/accept every display group (empty ones show `No sets yet`) and expand the
  `Pierna` rollup. Adding a new exercise via `ExercisePicker` asks for a muscle
  group when the name is unrecognized (`ensureExercise(userId, name, muscleGroup)`).
- `classifyExercise(name)` (`lib/ai.ts`) → optional AI muscle-group suggestion for
  unknown names; returns `{ muscleGroup, confidence } | null`.
- History shows `workout.name` (routine-day snapshot) or `Entrenamiento libre`.