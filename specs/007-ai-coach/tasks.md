# 007 — AI coach (tasks, FUTURE — not scheduled)

- [ ] Confirm scope (classification only, or + plateau coaching)
- [ ] Choose provider/model + cost ceiling; add env var to `.env.example`
- [ ] `app/api/classify-exercise/route.ts` (server-only key)
- [ ] `lib/ai.ts` with timeout + heuristic fallback
- [ ] Wire the add-exercise flow to try AI before the manual prompt
- [ ] Plateau helper + dismissible suggestion card
- [ ] Document privacy (only the exercise name is sent)
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
