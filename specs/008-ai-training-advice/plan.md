# 008 — AI training advice (plan)

**Spec:** `specs/008-ai-training-advice/spec.md`
**Status:** in progress

## Constitution refs

- §2.2 — generated tip in Spanish; UI chrome stays English.
- §2.6 — advice is online-only; failure surfaces and degrades, never silent.
- §3.3/§3.4 — no comments; small typed helpers.
- §3.5/§3.6 — the quota RPC stays `security definer`, `search_path = public`,
  re-checks `auth.uid()`; migration `0010` re-grants `EXECUTE` after changing the
  signature.
- §3.7 — `useWorkouts()`/`useExercises()` stay the single sources of truth; the
  coach only reads them.
- §3.9 — migration applied by hand and communicated with the exact SQL.
- §3.10 — the provider key is server-only.
- §5 — `lib/workout-data.ts` must not import `lib/data.ts`; `lib/coach.ts` reads
  stats, it introduces no cycle.

## Files

- `supabase/migrations/0010_consume_ai_quota_kind.sql` — generalize the quota RPC
  with `p_kind`.
- `lib/gemini.ts` (server) — shared `generateJson<T>({ apiKey, model, system,
  prompt, schema, timeoutMs })` + `geminiModel(fallback)`.
- `app/api/classify-exercise/route.ts` — refactor to use `lib/gemini.ts`; quota
  call with `p_kind: 'classify'`.
- `lib/coach.ts` (client, pure) — `buildCoachSignals`, `summarizeSignals`,
  `localAdvice`, `TrainingAdvice` type, closed detail/kind sets.
- `lib/advice-store.ts` (client) — per-user/day `localStorage` read/write/dismiss.
- `lib/ai.ts` — add `fetchAdvice(summary)` with timeout and `null` fallback.
- `app/api/coach-advice/route.ts` — auth, validate, quota `kind='advice'`, Gemini
  with closed schema, validate output.
- `components/coach-card.tsx` — card UI; mounted in `components/workout-screen.tsx`.
- Docs: `AGENTS.md`, `docs/SUPABASE.md`, `docs/ROADMAP.md`, and a cross-ref note in
  `specs/007-ai-coach/{spec,tasks}.md`.

## Algorithms

- **Plateau**: for each exercise with ≥3 sessions, take `bestPerWorkout` 1RM points
  in the recent window; plateau when the last 3 points do not exceed the value 3
  points back.
- **Imbalance**: `muscleGroupStats` volumes; compare push vs pull and quad vs
  posterior sums; flag when the ratio is outside `[1/1.5, 1.5]`.
- **Inactive**: display group with `sets > 0` and `lastDate` older than 10 days.
- **Deload**: ≥6 weeks spanned between first and last workout **and** ≥2 plateau
  signals (a broad lack of progress despite continuous training).
- **Summary sent**: `{ windowDays, sessions, signals[] }`, signals capped at 6,
  exercise label ≤80 chars, closed `kind`/`detail`/`group` values.

## Prompt / schema

- System: general fitness only, no medical advice, Spanish output, base solely on
  the given signals, no invented numbers, ≤3 actions.
- Input: the sanitized summary as delimited JSON. Exercise labels are treated as
  data, not instructions (prompt-injection mitigation).
- Output schema: `severity` enum, `headline`, `body`, `actions` (string array).

## Risks / tradeoffs

- Prompt injection via exercise names → delimited data + "treat as data" instruction
  + server-side length/enum re-validation.
- Wrong advice → guardrails + it never blocks anything and is dismissible.
- Cost/quota → shared daily limit + one cached tip per day.
- Provider latency/outage → 8 s server timeout, 10 s client timeout, local fallback.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
- Manual: tip with data; network payload inspection; second-tap cache; dismiss
  persistence; missing key / 429 → fallback; existing overrides intact.
