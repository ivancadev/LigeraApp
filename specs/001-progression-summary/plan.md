# 001 — Previous-progression summary per exercise (plan)

**Spec:** `specs/001-progression-summary/spec.md`
**Constitution refs:** §2.4, §3.4, §3.7

## Files touched

- `lib/stats.ts` — new `previousSession()`, `exerciseProgress()`.
- `components/exercise-card.tsx` — replace `lastNote: string | null` with a typed
  `progress?: ExerciseProgress` and render the block.
- `components/workout-screen.tsx` — pass `exerciseProgress(workouts, ex.name)`.
- `components/edit-workout-screen.tsx` — same, using `useWorkouts()`.

## Design

```ts
export type SessionSummary = { date: string; sets: LoggedSet[] }

export type ExerciseProgress = {
  last: SessionSummary | null
  deltaKg: number | null   // best kg this session vs prior session; null if < 2 sessions
  isPr: boolean            // last session's best 1RM == all-time best
  sessions: number
}

export function exerciseProgress(workouts: Workout[], name: string): ExerciseProgress
```

- Reuse the timestamp scan pattern from `lastBestSet()` (`lib/stats.ts`).
- `deltaKg` compares best-set kg of the latest session vs the immediately previous
  session that logged the exercise. `isPr` compares best 1RM of the latest session
  to `exerciseStats().best1Rm` (or an inline all-time max).
- `ExerciseCard` renders the block under the target/note:
  `Last (Mar 12): 40×8 · 40×8 · 37.5×7` and a trend chip.

## Migration

None.

## Risks / tradeoffs

- Long sessions produce a long set list; render with wrapping and a muted style.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
