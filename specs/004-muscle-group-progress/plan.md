# 004 — Muscle-group progression (plan)

**Spec:** `specs/004-muscle-group-progress/spec.md`
**Constitution refs:** §3.4, §3.7

## Files touched

- `lib/muscles.ts` (new) — canonical groups, seeded map, keyword fallback.
- `lib/stats.ts` — `groupVolumeByWorkout()`, `muscleGroupStats()` + types.
- `components/progress-chart.tsx` — generalize to an arbitrary numeric metric.
- `components/analytics-screen.tsx` — add the mode toggle + group views.
- `lib/exercises.ts` (spec 002) — supplies overrides.

## Design

```ts
// lib/muscles.ts
export const MUSCLE_GROUPS = ['Pecho','Espalda','Hombros','Bíceps','Tríceps',
  'Cuádriceps','Isquiotibiales','Glúteos','Gemelos','Core','Otros'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]
export const EXERCISE_MUSCLE: Record<string, MuscleGroup> = { /* 25 entries */ }
export function muscleGroupFor(name: string, overrides?: Map<string, MuscleGroup>): MuscleGroup
```

- `muscleGroupFor`: override map → exact seeded map → keyword heuristics
  (`gemelo|pantorrilla`→Gemelos, `femoral|isquio`→Isquiotibiales,
  `cuádriceps|prensa|sentadilla|extensión`→Cuádriceps, `banca|press.*inclinado|cruce|fondo`→Pecho/…),
  else `Otros`.
- `muscleGroupStats(workouts, overrides)` → per group `{ group, volume, sets,
  lastDate }`; `groupVolumeByWorkout(workouts, group, overrides)` → points
  `{ date, label, value }` (value = session volume).
- `progress-chart.tsx`: accept `data: { label; value }[]` and a `unit` label
  instead of hardcoding `oneRm`, keeping the existing single-exercise chart by
  mapping its points.

## Migration

None for the mapping (heuristics + overrides). Overrides come from spec 002's
table.

## Risks / tradeoffs

- Single primary group per exercise can under-count compound secondary muscles;
  acceptable for v1 and correctable via overrides.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
