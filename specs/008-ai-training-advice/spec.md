# 008 — AI training advice (spec)

**Status:** draft
**Owner:** Ivar
**Constitution refs:** §2.2, §2.6, §3.3, §3.4, §3.5, §3.6, §3.7, §3.9, §3.10, §5

## Problem / why

Progress already computes trends, PRs and per-group volume (specs 001/004/006), but
nothing turns those numbers into an actionable recommendation. The app shows *what
happened*, not *what to do*. Spec 007 solved one narrow case (classify the muscle
group of an unknown exercise) and left "coaching" deferred. This spec delivers it:
a Spanish training tip, requested on demand, built from **signals** computed on the
device.

## User stories

- As Ivar, I want a clear tip before training (add load, adjust volume, take a
  deload) so I can decide quickly what to do today.
- As Ivar, I want it to respect my data: nothing from my history leaves the device
  except a minimal summary of signals, and the tip is optional and dismissible.

## Functional requirements

- **FR1** A **client-side** signal engine (`lib/coach.ts`, pure, no network) derives
  from `useWorkouts()` + `useExercises()` overrides:
  - `plateau`: exercise with ≥3 logged sessions and no estimated-1RM (Epley)
    improvement over the last 3 sessions.
  - `imbalance`: push volume (Pecho+Hombros+Tríceps) vs pull (Espalda+Bíceps), or
    quads vs posterior chain (Isquiotibiales+Glúteos), outside `[1/1.5, 1.5]`.
  - `inactive`: a group trained before but not hit in ≥10 days.
  - `deload`: ≥6 weeks of continuous training with no new PR on ≥50% of the tracked
    exercises in the last two sessions.
  - Degradation: with <2 sessions, or no signal at all, a single `onnone` state
    (neutral encouraging message); never an empty list.
- **FR2** `CoachSignal` is typed and closed-vocabulary (`kind`, `group?`,
  `exercise?`, `detail` chosen from fixed templates, `value?`). The `detail` text is
  selected from fixed templates — it is **never free text from the user**.
- **FR3** A server route `POST /api/coach-advice` (`runtime = 'nodejs'`)
  authenticates with the server Supabase client, validates the summary against the
  closed vocabulary, consumes quota, and calls Gemini with a closed JSON schema. It
  returns `{ severity: 'ok' | 'watch' | 'act', headline, body, actions: string[] }`.
- **FR4** **Privacy**: the only thing leaving the device is
  `{ windowDays, sessions, signals[] }` — no dates, no set lists, no body data, no
  identifiers. `ai_requests` keeps storing only `user_id`, `kind`, `created_at`.
- **FR5** **Language**: the generated text is in **Spanish**. UI chrome/buttons stay
  in English (`Get advice`, `Dismiss`), per §2.2.
- **FR6** **Opt-in and location**: a `CoachCard` on the **Workout** screen with an
  explicit button. The AI is never called on app open.
- **FR7** **Cache and dismissal**: the day's tip is stored in `localStorage`
  (per-user key, like `ligera:advice`). Re-tapping shows the cached tip without
  spending quota; `Dismiss` hides it for the rest of the day. The deterministic
  reason (signal chips) is shown under the text for transparency.
- **FR8** **Degradation**: missing `GEMINI_API_KEY`, error, timeout or exhausted
  quota → the card shows a brief notice plus the local FR1 fallback; it never breaks
  the Workout screen nor blocks saving.
- **FR9** Quota reused: `consume_ai_quota(p_daily_limit, p_kind)` with
  `kind = 'advice'`; the daily limit is **shared** with classification.
- **FR10** Prompt guardrails: general fitness only, no medical advice, must not
  invent numbers, ≤3 short actions, based solely on the provided signals.

## Acceptance criteria

- [ ] Requesting a tip with enough data returns Spanish text + actions.
- [ ] The network only carries `{ windowDays, sessions, signals[] }` (verifiable in
      the network tab: no set lists, dates or historical kg).
- [ ] A second tap the same day uses the cache (no new request).
- [ ] `Dismiss` persists per user and day; it stays hidden after a reload.
- [ ] Missing key / 502 / 429 → local fallback, Workout intact.
- [ ] No provider key ever appears in the client bundle.

## Out of scope

- Storing tips in Supabase or keeping a tip history.
- A dedicated "Coach" tab or automatic generation on app open.
- Sending sets/dates/all exercise names (only the exercise flagged as plateau may
  travel as a label).
- Voice, images, or tips in other languages.

## Open questions

- Whether the plateau exercise name may travel as a label (007 precedent: only the
  name). Decision: **yes, only the flagged exercise**.
- FR1 thresholds (3 sessions, 1.5, 10 days, 6 weeks) — tunable constants.
