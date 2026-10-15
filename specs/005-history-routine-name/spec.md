# 005 — Routine name in history (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §2.1, §2.4, §3.4

## Problem / why

The History tab identifies a session only by date/time (`Mar 12 · 09:31 · N
exercises · X kg`). When reviewing past training I cannot tell at a glance which
routine day a session was (`Torso Fuerza`, `Empuje`, `Pierna Volumen`…). I want
the session to carry the name of the routine day it started from.

## User stories

- As Ivar, I want each saved session to show which routine day it was, so I can
  scan my history without opening every entry.
- As Ivar, I want a session started by hand (no routine) to be clearly labelled as
  `Entrenamiento libre`.

## Functional requirements

- **FR1** Starting a session from a routine day captures that day's `title` as the
  session name.
- **FR2** Starting a session by adding exercises manually leaves the name empty
  (`null` in the DB).
- **FR3** The name is a **text snapshot** stored on the workout — not a foreign
  key — so renaming or deleting the source routine never changes or breaks past
  sessions.
- **FR4** History renders the name as the primary line; date/time move to the
  secondary line. When the name is empty, render `Entrenamiento libre`.
- **FR5** An in-progress session persists its name in `localStorage` alongside the
  draft, and clears it on save/discard.
- **FR6** Editing a past session preserves its existing name.

## Acceptance criteria

- [ ] A routine-started session shows its routine title in History.
- [ ] A manual session shows `Entrenamiento libre`.
- [ ] Renaming/deleting the routine afterwards does not alter the saved name.
- [ ] Reloading mid-session keeps the name on the draft.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Linking workouts to `routines.id` (deliberately a snapshot).
- Filtering/searching history by routine name.
- Renaming a session from the History/Edit screen (kept as-is from when saved).
