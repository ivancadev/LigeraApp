# 004 — Muscle-group progression (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §1, §2.2, §2.4, §3.4

## Problem / why

Progress is tracked per exercise name only. When I train the same muscle with
different variations on different days (e.g. seated calf raise mixed with standing
calf raise), each variation has its own curve, so the group looks like it is going
backwards even when total work for the calves is increasing. I want to see
progression aggregated by **muscle group**.

## User stories

- As Ivar, I want a Progress view grouped by muscle, so variations of the same
  muscle combine instead of competing.
- As Ivar, I want to see volume and hard sets per muscle group over time.

## Functional requirements

- **FR1** Every exercise resolves to a muscle group via a seeded map for the 25
  programmed exercises, then a keyword fallback for custom names.
- **FR2** Progress gains a `By exercise | By muscle group` toggle.
- **FR3** In group mode, list each trained group with: total volume (Σ kg×reps),
  hard-set count, trend % over the selected range, and last trained date.
- **FR4** Selecting a group shows its per-session volume chart (same range
  selector).
- **FR5** A library `muscle_group` override (spec 002) takes precedence over the
  seeded map and heuristics.
- **FR6** Bodyweight exercises (kg 0) contribute to set count even though their
  volume is 0.

## Acceptance criteria

- [ ] Seated + standing calf both count toward `Gemelos`.
- [ ] Group mode shows volume, sets, trend and last date per group.
- [ ] Group chart renders and respects the 1M/3M/6M/ALL filter.
- [ ] Custom exercise with an assigned group is aggregated there.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Multiple muscle groups per exercise (v1 = one primary group).
- Weekly-average RIR aggregation.
