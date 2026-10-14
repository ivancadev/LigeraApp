# 002 — Exercise library, rename & pickers (spec)

**Status:** approved
**Owner:** Ivar
**Constitution refs:** §3.5, §3.6, §3.7, §3.9, §5

## Problem / why

Both "add exercise" pickers use a hardcoded list of 25 names. Custom exercises I
create live only inside the routine or workout where I typed them: they cannot be
edited, and they do not appear when adding exercises to a new routine. Renaming a
routine exercise also does not update the rest of my data.

## User stories

- As Ivar, I want custom exercises to persist in a library so they show up in the
  pickers for new routines and workouts.
- As Ivar, I want to rename an exercise everywhere (routines and history) in one
  action.
- As Ivar, I want to assign a muscle group to my own exercises (feeds spec 004).

## Functional requirements

- **FR1** A per-user `exercises` library table, owner-only RLS, seeded on first use
  from the 25 `exerciseOptions` with their seeded muscle groups.
- **FR2** Both pickers list the union of the library and any names already logged
  in past workouts, de-duplicated.
- **FR3** Adding a custom name to a routine or workout also adds it to the library.
- **FR4** A `rename_exercise(old, new)` RPC atomically rewrites
  `routine_exercises.name`, `workout_exercises.name` and the library row, scoped to
  `auth.uid()`.
- **FR5** The library management UI lets me rename an entry and set its muscle
  group.
- **FR6** Reject a rename to an empty name or to a name that already exists for the
  user (unique `(user_id, lower(name))`).

## Acceptance criteria

- [ ] A custom exercise created in a routine appears in the workout picker and in
      another routine's picker.
- [ ] Renaming updates the name in routines and in History.
- [ ] Muscle-group overrides persist and drive spec 004.
- [ ] RLS: another user cannot read or write my library.
- [ ] Migration `0005_exercise_library.sql` provided verbatim to paste.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- Reordering routine days (separate backlog item).
- Fuzzy/duplicate detection beyond exact case-insensitive name match.
