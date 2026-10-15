# 006 — Muscle groups: full list, Pierna rollup, assign-on-create (plan)

**Spec:** `specs/006-muscle-groups/spec.md`
**Constitution refs:** §3.4, §3.7

## Files touched

- `lib/muscles.ts` — `DISPLAY_GROUPS`, `ROLLUP`, helper to detect unknowns.
- `lib/stats.ts` — `muscleGroupStats`/`groupVolumeByWorkout` handle all groups +
  rollup.
- `components/analytics-screen.tsx` — list/select use display groups, empty rows.
- `lib/exercises.ts` — `ensureExercise(userId, name, muscleGroup?)`.
- `components/exercise-picker.tsx` — inline group selector for new names.
- `components/workout-screen.tsx`, `components/edit-workout-screen.tsx`,
  `components/routines-screen.tsx` — pass the group through the add flow.

## Design

```ts
// lib/muscles.ts
export const MUSCLE_GROUPS = [/* assignable: no Pierna */] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const LEG_SUBGROUPS = ['Cuádriceps','Isquiotibiales','Glúteos','Gemelos'] as const
export const ROLLUP: Record<string, MuscleGroup[]> = { Pierna: [...LEG_SUBGROUPS] }

export const DISPLAY_GROUPS = [
  /* all assignable groups except Otros */, 'Pierna', 'Otros',
] as const
export type DisplayGroup = (typeof DISPLAY_GROUPS)[number]
```

- Add a small helper `isKnownGroup(name): boolean` for the picker (i.e. the name is
  in the seeded map, or matches a keyword, or is already in the library) so it can
  decide whether to ask.
- `stats.ts`:
  - `muscleGroupStats(workouts, overrides)` returns one entry per **assignable**
    group (0 defaults) plus a computed `Pierna` rollup whose volume/sets/lastDate
    is the sum/max over its members.
  - `groupVolumeByWorkout(workouts, group, overrides)`: when `group` is in
    `ROLLUP`, sum the member groups' per-date volume instead of one group.
  - Reuse `pctTrend` in the screen (no stats change needed).
- `analytics-screen.tsx`: iterate `DISPLAY_GROUPS` (ordered) so empty groups render;
  the per-group chart already has an empty state (`No logged sessions for X`).
- Picker add flow: track the typed name; if it is not in the library and
  `!isKnownGroup(name)`, reveal a `<select>` of `MUSCLE_GROUPS` (default `Otros`)
  plus the Add button. On confirm call `onAdd(name, group)`.
  - `onAdd` signature becomes `(name: string, muscleGroup?: MuscleGroup) => void`;
    callers forward the group to `ensureExercise`.

## Migration

None (display-only change; overrides already persist in spec 002's table).

## Risks / tradeoffs

- Empty groups add rows; ordered list keeps `Otros` last and `Pierna` near the leg
  groups to stay readable.
- `Pierna` overlapping its members is intentional (rollup, not assignment).

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
