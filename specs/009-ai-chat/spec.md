# 009 — AI chat & generated routine tables (spec)

**Status:** implemented
**Owner:** Ivar
**Constitution refs:** §1 (amended), §2.1, §2.2, §2.3, §2.6, §3.3, §3.4, §3.5, §3.6, §3.7, §3.9, §3.10, §5 (amended)

## Problem / why

Ligera can classify an exercise and produce a training tip, but the user cannot
ask for a specific workout table in natural language. The only program source is
the PDF-seeded routine. This feature adds an in-app AI conversation that can
answer questions and generate a structured routine table on demand, without
uploading files.

## User stories

- As Ivar, I want to ask the AI for a table (“4 días upper/lower”, “5 días
  push/pull/legs”, “3 días full body”) so I can get a plan without building it
  manually.
- As Ivar, I want to review the table before saving it so a bad generation never
  overwrites my routines.
- As Ivar, I want to keep chatting and refine the table (“hazla de 3 días”) so I
  do not have to start over.
- As Ivar, I want the chat available from any screen without adding a fifth tab.

## Functional requirements

- **FR1** A chat overlay opens from a `Sparkles` button in the app header. It is
  available on Workout, Routines, History and Progress. No fifth tab is added.
- **FR2** The chat sends messages to `POST /api/coach-chat`. The route
  authenticates with Supabase, consumes the shared AI quota with
  `kind = 'chat'`, and calls the existing server-only Gemini helper.
- **FR3** The AI replies in Spanish. UI chrome/buttons stay in English. It may:
  - answer general training questions,
  - ask one short clarifying question,
  - return a structured `RoutinePlan` with 1–7 days and 1–15 exercises per day.
- **FR4** The only context sent is the last 8 chat messages and the user's
  exercise library (`name`, `muscleGroup`). No workouts, dates, kg, set lists or
  identifiers leave the device.
- **FR5** The AI prioritizes the user's library and may propose common new
  exercises. New exercises are only added to the library when the table is saved.
- **FR6** `RoutinePlan` is a closed schema: day titles, exercise names, sets,
  rep range, RIR text, optional note, bodyweight flag and a muscle group from
  `MUSCLE_GROUPS`. The server re-validates every field.
- **FR7** The table renders in the chat with `Add to Routines` (append),
  `Replace all` (confirmed destructive action) and `Discard`. Nothing is written
  before the user taps a save action.
- **FR8** Saving is atomic via the `save_generated_routines` RPC. It inserts the
  days, exercises and new library entries in one transaction, then dispatches the
  routines/exercises changed events.
- **FR9** Chat history is cached per user in `localStorage` (`ligera:chat`),
  capped at 40 messages. It survives closing/reloading; `Clear` deletes it.
- **FR10** Failures (missing key, quota, timeout, invalid output, network) show a
  visible message and keep the chat usable. They never modify routines.
- **FR11** The AI never gives medical advice; the overlay shows
  `AI guidance, not medical advice.`

## Acceptance criteria

- [ ] Header button opens the chat from every tab and closes it cleanly.
- [ ] Asking for a 4-day upper/lower table returns a valid preview.
- [ ] A follow-up (“hazla de 3 días”) keeps context and regenerates.
- [ ] `Add to Routines` appends the days; `Replace all` asks for confirmation and
  replaces all routines; `Discard` changes nothing.
- [ ] New exercises in the table appear in the library after saving.
- [ ] Reloading keeps the chat history; `Clear` removes it.
- [ ] Network payload contains only messages + library names/groups.
- [ ] 401/429/502/503 and network errors are visible and non-destructive.
- [ ] `pnpm exec tsc --noEmit` and `pnpm build` pass.

## Out of scope

- File uploads (PDF, images, CSV) and OCR.
- Streaming responses or voice input.
- Reading workout history/sets to personalize the advice.
- A fifth “AI” tab.
- Cross-device chat history (no Supabase table for conversations).
- Automatically saving generated tables.

## Open questions

- None blocking. The append action is primary; replace is secondary and
  confirmed.
