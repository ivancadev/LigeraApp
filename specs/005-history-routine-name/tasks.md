# 005 — Routine name in history (tasks)

- [ ] Write `supabase/migrations/0006_workout_name.sql` (column + recreate RPCs)
- [ ] `lib/data.ts`: `Workout.name`, select, `p_name` on save + update
- [ ] `lib/session.ts`: persist `name`
- [ ] `workout-screen.tsx`: `sessionName` state (start/save/discard/reload)
- [ ] `history-screen.tsx`: show name, fallback `Entrenamiento libre`
- [ ] `edit-workout-screen.tsx`: preserve name on update
- [ ] Docs: `SUPABASE.md`, `AGENTS.md`, `ROADMAP.md`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
