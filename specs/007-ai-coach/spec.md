# 007 — AI coach: classify unknown exercises (spec, SHIPPED)

**Status:** shipped (classification only; plateau coaching deferred)
**Owner:** Ivar
**Constitution refs:** §2.2, §2.5, §3.4, §3.5, §3.10, §3.11

> Scope confirmed with the user: this iteration ships **classification only**.
> Plateau coaching (below) remains deferred and is **not implemented**.

## Problem / why

When a new exercise name is neither in the seeded map nor matched by the keyword
heuristic, the user must choose the muscle group by hand (spec 006). A language
model can usually infer it from the name, removing a manual step without leaving
the app.

## User stories

- As Ivar, I want unknown exercise names auto-classified so I rarely pick a group.
- As Ivar, I want the suggestion to be correctable and optional.

## Functional requirements

- **FR1** A **server** route (`app/api/classify-exercise`) performs the
  classification; the provider key lives only server-side (env var), never
  shipped to the client. ✅
- **FR2** The route returns a structured `{ muscleGroup, confidence }` from the
  closed `MUSCLE_GROUPS` set, validated server-side. ✅
- **FR3** Results are cached in `exercises.muscle_group`; only the group the user
  finally confirms is persisted, respecting the spec 002/006 override precedence
  (an existing user override is never overwritten). ✅
- **FR4** Failure/timeout degrades gracefully to the manual picker / `Otros` and
  never blocks saving a workout. ✅
- **FR5** Only the exercise **name** is sent to the provider. No workout or
  personal data leaves the device; the name is never logged or stored. ✅
- **FR6** The feature is opt-in (an explicit `Suggest with AI` button) and
  rate-limited per user per day. ✅

### Deferred (not implemented)

- Plateau detection ("no improvement over N sessions") and a dismissible
  suggestion card. Revisit as a separate feature; it can be computed
  client-side so no data leaves the device.

## Acceptance criteria

- [x] New unknown exercise → suggested group, correctable by the user.
- [x] No API key is ever present in client bundles.
- [x] Missing key / provider failure / quota exhausted → manual picker still works.

## Privacy

The route receives `{ name }` and nothing else. It sends the name to Google
Gemini and returns a group. The `ai_requests` table stores only `user_id`,
`kind` and `created_at` — never the exercise name. See `docs/SUPABASE.md`.

## Out of scope

- Sending personal training data to a provider.
- Auto-writing routines or renaming exercises.
- AI-phrased plateau coaching.

## Open questions (for the deferred plateau work)

- Whether plateau coaching reuses this route or stays fully client-side.
- Cost ceiling if the free tier ever changes.
