# 007 — AI coach (plan, SHIPPED — classification only)

**Spec:** `specs/007-ai-coach/spec.md`
**Status:** shipped (classification only).

## Constitution refs

- §2.2/§2.5 — only the exercise name leaves the device; the route is online-only.
- §3.5/§3.6 — new table `ai_requests` has RLS owner-only; the quota RPC is
  `security definer` with `search_path = public` and re-checks `auth.uid()`.
- §3.10/§3.11 — the provider key is server-only; migration applied by hand.

## What shipped

- `supabase/migrations/0009_ai_requests.sql` — `ai_requests` table + index +
  owner-only `select` policy + `consume_ai_quota(p_daily_limit)` RPC.
- `app/api/classify-exercise/route.ts` — POST `{ name }`; authenticates via the
  server Supabase client, checks quota, calls Google Gemini with a constrained
  JSON schema over `MUSCLE_GROUPS`, validates the result.
- `lib/ai.ts` — client helper `classifyExercise(name)` with a timeout and a
  `null` fallback; never throws into the UI.
- `components/exercise-picker.tsx` — `Suggest with AI` button inside the
  "Which muscle group?" panel; preselects the returned group and shows the
  confidence; the user can still pick another chip.
- `.env.example` — `GEMINI_API_KEY`, optional `GEMINI_MODEL` and `AI_DAILY_LIMIT`.

## Provider

- Google Gemini free tier, REST `v1beta/models/{model}:generateContent`.
- Default model `gemini-3.1-flash-lite`, overridable via `GEMINI_MODEL`.
- Key sent in the `x-goog-api-key` header so it never appears in URLs/logs.
- Structured output (`responseMimeType` + `responseSchema`) with the group enum.

## Risks / tradeoffs

- Provider outage/latency → 8 s server timeout + 10 s client timeout; falls back
  to the manual picker.
- Privacy: free-tier prompts may be used to improve Google's models — only an
  exercise name is ever sent.
- Quota is fail-closed: if the quota RPC errors, the request fails back to the
  manual picker rather than bypassing the limit.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
- Manual: suggestion shown and correctable; missing key → fallback; invalid key →
  fallback; quota exhausted → fallback; existing muscle-group override intact.
