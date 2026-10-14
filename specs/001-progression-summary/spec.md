# 001 — Previous-progression summary per exercise (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §2.4, §2.5, §3.7, §5

## Problem / why

While training, the exercise card only shows a single line: "Last time: 40 kg × 8"
(the best set of the most recent session). I cannot see the whole previous
session, nor whether I am progressing versus the session before it. That context
is exactly what I need to decide today's weight.

## User stories

- As Ivar, I want to see the full set list of the last time I did an exercise, so
  I can replicate or beat it.
- As Ivar, I want to see how the last session compares to the one before, so I
  know at a glance if I progressed.

## Functional requirements

- **FR1** Show, on each exercise card, the date and every set (kg × reps) of the
  most recent session that contains that exercise.
- **FR2** Show a trend indicator comparing the best set of the most recent session
  against the best set of the session before it (delta in kg).
- **FR3** Flag when the most recent session set a personal record (best estimated
  1RM across all logged sessions for that exercise).
- **FR4** Hide the whole block when the exercise has never been logged.
- **FR5** The same summary appears in the edit-workout screen.

## Acceptance criteria

- [ ] On the workout screen, a previously logged exercise shows `Last (Mar 12):`
      followed by all its sets.
- [ ] A trend chip shows `↑ +2.5 kg`, `↓ -2.5 kg`, `= 0 kg`, or `PR`.
- [ ] An exercise never logged shows nothing extra.
- [ ] Editing a past workout shows the same summary.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Charts or multi-session history on the card (that lives in Progress).
- Per-set RIR suggestions or auto-progression changes (already exist elsewhere).
