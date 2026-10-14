# Ligera — Constitution

> **This document is the absolute source of truth for the project.**
> When any code, spec, comment, plan or agent instruction conflicts with this
> file, this file wins. Nothing in the repository may contradict it without a
> documented amendment (see *Amendments* at the bottom).

---

## 1. What Ligera is

A mobile-first workout tracker (PWA) for Ivar's 5-day advanced training routine.
The user can:

- Start an editable routine template (per-user, seeded from the 5 default days),
  or add exercises by hand.
- Log each set with kg / reps / RIR and mark sets complete.
- Save sessions to Supabase atomically via the `log_workout` RPC.
- Review past workouts (History) and long-term strength trends (Progress).

**North star (deferred, not implemented):** friend-to-friend competition —
weekly volume leaderboards. The schema is normalized with this in mind;
`profiles` usernames are readable by any authenticated user.

## 2. Product invariants (never violate)

1. **Dark theme only.** No light mode, no theme switch.
2. **Language split.** Exercise names, routine day titles and target text are in
   **Spanish** (from the training plan). All UI chrome/labels are in **English**.
3. **Phone frame.** `max-w-md`, `min-h-svh`, sticky `backdrop-blur` headers,
   bottom navigation with 4 tabs.
4. **Numeric conventions.** kg steppers: 2.5 kg increments, 0.1 precision.
   Reps: 1, integer. Estimated 1RM uses the **Epley** formula
   `kg * (1 + reps / 30)`.
5. **RIR semantics.** `rir` is `smallint nullable`, range 0–3; **0 = to failure**.
6. **Online-only data.** No offline cache for user data. The PWA caches only
   static assets. A failed save must surface a visible error, never fail silently.

## 3. Engineering invariants

1. **Stack is fixed** unless deliberately amended: Next.js 16 (App Router),
   React 19, TypeScript 5.7, Tailwind v4, shadcn/ui primitives, Recharts,
   lucide-react, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), pnpm.
2. **No lint script exists.** Verification is `pnpm exec tsc --noEmit` and
   `pnpm build` (the deploy gate). Both must pass before anything ships.
3. **No code comments** unless the user explicitly asks for them.
4. **Small, typed components.** Prefer small typed helpers over inline logic.
5. **Every new table has RLS enabled**, owner-only, resolving ownership through
   `auth.uid()` (directly or up the parent chain). The only exception is reading
   `profiles` usernames for the competition north star.
6. **Atomic writes.** Session saves/edits go through the Postgres RPCs
   (`log_workout`, `update_logged_workout`) in a single transaction.
   `security definer` functions set `search_path = public` and re-check ownership.
7. **Single source of truth per data domain.** `useWorkouts()` owns logged data,
   `useRoutines()` owns routine days, `useExercises()` owns the exercise library.
   Every mutation dispatches its `ligera:*-changed` window event so other screens
   refresh.
8. **Draft session lives in `localStorage`** (`ligera:session`, keyed per user),
   cleared on save or discard.
9. **Migrations are manual.** Files live in `supabase/migrations/`, are applied by
   hand in the Supabase SQL Editor, and every new migration must be communicated
   to the user with the exact SQL to paste. No supabase CLI linkage.
10. **Secrets.** The anon key is public by design; never use the service-role key
    client-side. Never commit `.env.local`, tokens or `*.pdf`.
11. **Deploy.** Vercel auto-deploys on push to `main`
    (`origin` → `https://github.com/ivardev33/LigeraApp.git`). Never commit or push
    unless explicitly told.

## 4. Spec-first workflow (SDD)

All non-trivial work follows a spec-driven flow. The **constitution governs every
spec**; a spec may not contradict it.

```
constitution.md  →  specs/NNN-feature/spec.md  →  plan.md  →  tasks.md  →  code
```

- **Spec** (`spec.md`): the *what* and *why* — problem, user stories, functional
  requirements, acceptance criteria, out-of-scope. No implementation details.
- **Plan** (`plan.md`): the *how* — files touched, schema/migration, algorithms,
  risks. Must cite the constitution sections it relies on.
- **Tasks** (`tasks.md`): ordered, checkable implementation steps.
- **Code** follows only after the spec exists and is approved.

Templates live in `specs/0000-template/`. Pick the next free `NNN`. Keep specs
current: when a feature changes, update its spec in the same change.

## 5. Conventions

- Exercise names stay **exactly** as logged (Spanish, accents intact). Never
  translate or normalize an exercise name in data or UI.
- Target values derive from the PDF-seeded `defaultRoutineDays`; do not invent
  programs.
- `lib/workout-data.ts` must not import `lib/data.ts` (never create a cycle).
- `Intl.NumberFormat('en-US')` for big numbers; kg keeps its own decimals.
- Prefer editing existing files and following neighboring patterns.

## 6. Amendments

This constitution changes only by deliberate amendment:

1. Propose the change in writing to the user (what and why).
2. Get explicit approval.
3. Apply the edit here, in the same change as any resulting code/spec updates.
4. Note the amendment in `docs/ROADMAP.md`.

Silent drift from this document is a bug.
