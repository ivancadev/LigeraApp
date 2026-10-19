# 007 — AI coach (tasks, SHIPPED — classification only)

- [x] Confirm scope: classification only (plateau coaching deferred)
- [x] Provider: Google Gemini free tier (`gemini-3.1-flash-lite` by default)
- [x] Migration `0009_ai_requests.sql` (quota table + RPC)
- [x] `app/api/classify-exercise/route.ts` (server-only key, quota, validation)
- [x] `lib/ai.ts` with timeout + null fallback
- [x] Wire the picker to try AI before the manual prompt
- [x] Document privacy (only the exercise name is sent)
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm build`

## Deferred

- [ ] Plateau helper + dismissible suggestion card (separate feature)
