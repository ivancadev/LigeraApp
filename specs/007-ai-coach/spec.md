# 007 — AI coach: classify exercises & suggest variations (spec, FUTURE)

**Status:** proposed (not scheduled)
**Owner:** Ivar
**Constitution refs:** §1, §2.2, §3.4

> Written now to capture intent and constraints. **Not implemented** in the
> current iteration. When picked up, confirm scope before coding.

## Problem / why

Two related gaps that a language model can close cheaply, without leaving the app:

1. **Classification** — when a new exercise name is neither in the seeded map nor
   matched by the keyword heuristic, the user must choose the muscle group by
   hand (spec 006). A model can usually infer it from the name.
2. **Plateau coaching** — when an exercise's kg/volume has not improved over N
   sessions, suggest a variation or a rep/RIR tweak.

## User stories

- As Ivar, I want unknown exercise names auto-classified so I rarely pick a group.
- As Ivar, I want a nudge when I've stalled, with a concrete variation to try.

## Functional requirements (draft)

- **FR1** A **server** route (`app/api/...`) performs classification; the provider
  key lives only server-side (env var), never shipped to the client.
- **FR2** The route returns a structured result `{ muscleGroup, confidence }` from
  a closed set of `MUSCLE_GROUPS` (validated server-side).
- **FR3** Results are cached in `exercises.muscle_group`; the client only persists
  confirmed groups (respecting spec 002/006 override precedence).
- **FR4** Failure/timeout degrades gracefully to the heuristic / `Otros` and never
  blocks saving a workout.
- **FR5** Plateau detection reuses logged data (e.g. last N sessions with no
  increase in best set or volume) and is computed client-side; the model only
  phrases the suggestion. No workout data leaves the device except an exercise
  name (classification) — document this explicitly.
- **FR6** The feature is opt-in and rate-limited to control cost.

## Acceptance criteria

- [ ] (draft) New unknown exercise → suggested group, correctable by the user.
- [ ] (draft) No API key is ever present in client bundles.
- [ ] (draft) Stalled exercise → one suggestion, dismissible.

## Out of scope (for now)

- Sending personal training data to a provider.
- Auto-writing routines or renaming exercises.

## Open questions

- Provider/model choice and cost ceiling.
- Where the prompt + taxonomy live (server constants vs. DB).
- Whether plateau coaching is a separate feature from classification.
