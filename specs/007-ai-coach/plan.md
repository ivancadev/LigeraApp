# 007 — AI coach (plan, FUTURE)

**Spec:** `specs/007-ai-coach/spec.md`
**Status:** proposed — do not implement yet.

## Sketch (to validate later)

- `app/api/classify-exercise/route.ts` — POST `{ name, candidates }`, calls the
  provider with a constrained prompt, validates the returned group against
  `MUSCLE_GROUPS`, returns `{ muscleGroup, confidence }`. Key from env (server).
- `lib/ai.ts` — thin client helper with an AbortController timeout and a
  heuristic fallback; used only by the add-exercise flow when the group is
  unknown (after spec 006's manual prompt is skipped/declined).
- Plateau helper in `lib/stats.ts` (pure, testable) + a dismissible suggestion card
  in `analytics-screen.tsx`.
- `.env.example`: document the provider key; `.env.local` stays gitignored.

## Risks / tradeoffs

- Cost, latency, and privacy (send only the exercise name).
- Provider outages → heuristic fallback is mandatory.

## Verification (when built)

- `pnpm exec tsc --noEmit`
- `pnpm build`
- Manual: unknown name returns a validated group; simulated failure falls back.
