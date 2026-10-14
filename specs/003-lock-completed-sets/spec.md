# 003 — Lock completed sets (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §2.3, §3.4

## Problem / why

Once I tick a set as complete, its kg/reps steppers stay live. While scrolling or
swiping the screen with my finger, I accidentally change values in sets I already
finished, corrupting the log.

## User stories

- As Ivar, I want a completed set to be read-only, so a stray swipe cannot change
  it.
- As Ivar, I want to intentionally unlock a completed set when I really need to
  fix it.

## Functional requirements

- **FR1** When a set is marked complete, its kg and reps render as static text
  (no steppers, no long-press repeat).
- **FR2** A completed set's RIR badge and remove button are inert (not tappable).
- **FR3** The completion toggle (check) remains tappable and un-completes the set,
  restoring editing.
- **FR4** Completed sets are visually distinct (existing highlight) with a lock
  affordance implying "locked".

## Acceptance criteria

- [ ] Tapping the check locks the row; kg/reps become static text.
- [ ] Swiping across a locked row changes nothing.
- [ ] Tapping the check again unlocks and steppers return.
- [ ] Applies on both the workout screen and the edit-workout screen.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Global "lock all" toggle.
- Preventing removal of the whole exercise.
