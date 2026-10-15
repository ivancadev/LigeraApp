# 006 — Muscle groups: full list, Pierna rollup, assign-on-create (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §1, §2.2, §2.4, §3.4

## Problem / why

The Progress "By muscle group" view (spec 004) only lists groups that already
have logged sets, so `Bíceps`/`Tríceps` look like they are missing until trained,
and there is no leg-wide view — leg work is split across `Cuádriceps`,
`Isquiotibiales`, `Glúteos` and `Gemelos`. Also, when a newly created exercise
does not match the seeded map or the keyword heuristic it silently lands in
`Otros` with no prompt to correct it.

## User stories

- As Ivar, I want to see every muscle group in the list even with zero data, so I
  know they exist.
- As Ivar, I want a `Pierna` entry that combines all my leg work.
- As Ivar, when I add an exercise whose group can't be detected, I want to be
  asked which group it is.

## Functional requirements

- **FR1** The group list and selector show all display groups, including ones with
  zero volume/sets (rendered as `0 sets / — kg` with no trend).
- **FR2** A `Pierna` **rollup** row aggregates the leg sub-groups
  (`Cuádriceps` + `Isquiotibiales` + `Glúteos` + `Gemelos`): volume, sets, trend
  and per-session chart sum the members.
- **FR3** `Pierna` is display-only — never assigned to an exercise and never
  returned by `muscleGroupFor`.
- **FR4** When adding an exercise whose resolved group is `Otros` (or a name not
  yet in the library), the picker shows an inline muscle-group selector before
  adding; the chosen group is stored on the library row.
- **FR5** `ensureExercise` accepts an optional muscle group so the add flow can
  persist the choice in one step.
- **FR6** Existing overrides (spec 002) still win over the seeded map/heuristics.

## Acceptance criteria

- [ ] `Bíceps`/`Tríceps` (and other empty groups) always appear in group mode.
- [ ] `Pierna` sums quads + hams + glutes + calves for volume, sets and chart.
- [ ] Adding `Curl Nórdico` (unknown) asks for a group and stores it.
- [ ] Selecting `Pierna` in the `<select>` renders the aggregated chart.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Multi-group exercises (an exercise still has one primary group).
- AI classification of unknown names (deferred to spec 007).
- Persisting display preferences.
