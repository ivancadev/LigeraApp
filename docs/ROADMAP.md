# Ligera — Roadmap & session log

Working memory for where the product has been and where it is going.
Update this file every time a feature ships to keep it accurate.

## Session log

### MVP (local first, shipped)
- v0 base scaffolded by v0 (Next.js 16 / React 19 / TS 5.7 / Tailwind v4 /
  shadcn/ui / Recharts / lucide).
- Workout screen: multi-exercise draft, kg/reps steppers, rest timer, Finish → save.
- Progress screen: real 1RM chart (Epley), stat cards, PRs.
- Everything stored in localStorage.

### Supabase integration (shipped)
- `@supabase/supabase-js` + `@supabase/ssr` installed.
- SQL migration `0001_init.sql`: profiles, workouts, workout_exercises,
  workout_sets, RLS (owner-only for everything except username reads),
  profile auto-create trigger on signup.
- `lib/supabase/{client,server,middleware}.ts` + root `proxy.ts` (replaces the
  old `middleware.ts`; Next 16 convention).
- `lib/data.ts` (fetch/save), `lib/auth.ts` (session/user/profile + auth actions).
- Auth screen, user menu, session gate in `page.tsx`. Async save + error toast.
- Rebranded "Iron Log" → **Ligera**.

### Routine templates + History (shipped)
- `lib/workout-data.ts`: 25 Spanish exercises, `routineDays` (5 days), targets
  (`4 × 5–7 · RIR 1.5–2`), `RoutineExercise`/`RoutineDay`/`DraftSet`/`DraftExercise`.
- Workout screen: "Start routine day" pre-fills template exercises with last-logged
  weights; "Add exercises manually" keeps custom names; per-exercise X to remove.
- New **History** tab (3rd) with expandable per-workout detail, duration, set/volume counts.
- Exercise cards show the target string.

### Delete in History + RIR + smart rest + auto-progression + PWA (shipped)
- Delete a whole workout, or a single exercise inside an expanded past workout,
  from History with confirmation dialogs.
- RIR per set: nullable `rir` column on `workout_sets` (migration `0002_rir.sql`),
  tappable RIR badge (0–3) on each set row, RIR shown on history set chips.
- Rest timer duration per exercise (`restSeconds` in routine data) and timer resets
  when a new set is completed.
- Auto-progression hint: "↑ Next: +2.5 kg" on routine exercises that hit the top of
  the target rep range in the previous session.
- PWA: installable manifest, service worker (network-first navigation),
  generated icons, registration in the root layout.

### Editable routines + atomic saves + faster input (previous iteration)
- **Fixed saving**: workouts now save atomically via `log_workout` RPC (one
  transaction), and `useWorkouts` logs errors instead of failing silently.
  Root cause of "no se guarda" was most likely an unapplied migration — apply
  `0002_rir.sql` first, then `0003_routines.sql`.
- **Editable routines**: new `routines` / `routine_exercises` tables (owner-only
  RLS). The 5 default days are seeded into the account on first fetch and then
  freely editable: create/rename/delete days, add/rename/edit/delete exercises
  (name, sets, rep range, RIR, note) from a new **Routines** tab.
- **Background-safe timer**: elapsed time is computed from wall-clock timestamps
  (module-level session start), so it keeps counting after the phone locks and
  across tab switches. No more paused-at-lock-offset.
- **Rest timer removed**: per-exercise rest bar deleted; exercise advice (target
  text, RIR, notes) stays on the cards — routine `note` now visible.
- **Faster weight entry**: `NumberStepper` center value is now a direct text
  input (`inputMode="decimal"`) and the `+ / −` buttons repeat on long-press.

### Spec-first constitution + 4 UX upgrades (previous iteration)
- **Constitution adopted** (`docs/constitution.md`): the absolute source of truth;
  spec-first workflow (`constitution → specs/NNN/spec.md → plan.md → tasks.md →
  code`) documented in `AGENTS.md`. Templates in `specs/0000-template/`.
- **Spec 001 — Progression summary per exercise**: exercise cards now show the date
  and full set list of the last session (`Last (Mar 12): 40×8 · 40×8 · 37.5×7`)
  plus a trend chip (`↑ +2.5 kg` / `↓ -2.5 kg` / `PR`). Also shown in the edit screen.
- **Spec 002 — Exercise library**: new per-user `exercises` table (migration
  `0005_exercise_library.sql`, owner-only RLS), seeded from the 25 defaults with
  muscle groups. Pickers list library + logged names; custom exercises persist and
  appear in every picker. `rename_exercise` RPC propagates a rename to routines and
  history. Management UI (rename + muscle group) inside the picker.
- **Spec 003 — Lock completed sets**: a completed set renders kg/reps as static
  text with a lock glyph; steppers, RIR and delete are inert until unlocked
  (tap the check again). Prevents accidental edits while swiping.
- **Spec 004 — Muscle-group progression**: Progress gains a `By exercise | By
  muscle group` toggle. `lib/muscles.ts` maps exercises to groups (seeded map +
  keyword heuristic + library override). Volume (kg×reps) and hard-set count
  aggregate per group, so seated + standing calf combine under `Gemelos`.

### History routine names + full muscle-group list (current iteration)
- **Spec 005 — Routine name in history**: sessions store a text snapshot of the
  routine day (`workouts.name`, migration `0006_workout_name.sql`); History shows
  the name as the primary line and falls back to `Entrenamiento libre` for manual
  sessions. Renaming/deleting the routine never rewrites past sessions.
- **Spec 006 — Muscle groups**: the Progress group view now lists **every** group
  (empty ones show `No sets yet / —`) and adds a display-only `Pierna` rollup that
  combines Cuádriceps+Isquiotibiales+Glúteos+Gemelos for volume, sets, trend and
  chart. Adding an exercise whose group can't be detected now reveals an inline
  "which muscle group?" picker before it is added.
- **Spec 007 — AI exercise classification (shipped)**: unknown names can be
  classified with an explicit `Suggest with AI` button. The client calls
  `app/api/classify-exercise`, which authenticates, consumes a per-user daily
  quota (migration `0009_ai_requests.sql`) and queries Google Gemini with a
  constrained JSON schema over `MUSCLE_GROUPS`. Only the exercise name leaves the
  device; any failure falls back to the manual group picker.

### AI training advice (spec 008)

- **Spec 008 — AI training advice (shipped)**: a `CoachCard` on the Workout screen
  offers an opt-in `Get advice` tip before training. `lib/coach.ts` computes
  closed-vocabulary signals on the device (plateau, push/pull and quad/posterior
  imbalance, inactive group, deload) and only that summary is sent to
  `app/api/coach-advice`; Gemini writes a Spanish tip plus ≤3 actions. Quota is
  shared with classification (migration `0010` adds `p_kind`). The tip is cached
  per user/day in `localStorage` (`ligera:advice`) and can be dismissed; any
  failure uses the local fallback. The deferred half of spec 007 now lives here.

### AI chat + generated tables (spec 009, current iteration)

- **Spec 009 — AI chat & generated routine tables**: a `Sparkles` button in the
  header opens a global `CoachChat` overlay (no fifth tab). The user can ask for a
  table in Spanish; `app/api/coach-chat` authenticates, consumes quota with
  `p_kind: 'chat'`, and returns `{ reply, table }` against a closed `RoutinePlan`
  schema (1–7 days, 1–15 exercises/day, safe ranges, `MUSCLE_GROUPS`). Only the
  last 8 messages + exercise library names/groups leave the device. The preview
  offers `Add to Routines`, confirmed `Replace all` and `Discard`; saving goes
  through the atomic `save_generated_routines` RPC (migration `0011`) and then
  dispatches the routines/exercises change events.
- **Constitution amendment**: §1 and §5 now allow AI-generated routine tables on
  explicit request, with preview and confirmation; the seeded PDF routine remains
  the baseline and is never replaced automatically.

## Decisions (and why)

- **Normalized schema** (4 tables) instead of JSONB per-workout — keeps the door
  open for the friend-competition leaderboard while remaining simple.
- **Online-only saves**: no offline cache for data. Rationale: user trains in a gym
  with reliable connection; keeps save/refresh trivial. PWA caches only static assets.
- **Exercise names in Spanish**: they mirror Ivar's training PDF; UI chrome stays English.
- **Aware the app does not work offline** for data; documented, not a bug.
- **`proxy.ts` over `middleware.ts`**: deprecated in Next.js 16.
- **Supabase anon key is public** by design; never put the service-role key client-side.

## Known issues (to fix)

- After finishing a workout, History/Progress refresh via the `ligera:workouts-changed`
  event. If a screen still shows stale data after a save/delete, that event flow broke.
- RIR history chips show the value but there is no RIR aggregation in Progress yet
  (nice future addition: average RIR / effort per week).
- Routine seeding is guarded by "has zero routines" (no locked flag); a concurrent
  double-fetch could in theory seed twice. Harmless today (single user), but could
  use a unique `user_id` marker if it ever bites.

## Backlog / ideas

- **Friends competition** (north star): friendships + invite-by-username,
  weekly volume leaderboard. Schema support already planned (profiles reads open).
- Average RIR per week in Progress.
- Deload reminder (the PDF calls for deload every 6–8 weeks).
- Google OAuth sign-in (email/password is in place).
- Reorder exercises / routine days in the Routines tab.