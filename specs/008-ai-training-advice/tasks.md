# 008 — AI training advice (tasks)

- [ ] Migration `0010_consume_ai_quota_kind.sql` (parameterize `consume_ai_quota`);
      apply and hand the SQL to the user (§3.9)
- [ ] `lib/gemini.ts` shared server helper
- [ ] Refactor `app/api/classify-exercise/route.ts` to use `lib/gemini.ts`
- [ ] `lib/coach.ts`: signal engine (`buildCoachSignals`, `summarizeSignals`,
      `localAdvice`, closed vocab, `TrainingAdvice` type)
- [ ] `lib/advice-store.ts`: per-user/day cache + dismiss
- [ ] `lib/ai.ts`: `fetchAdvice(summary)` with timeout + null fallback
- [ ] `app/api/coach-advice/route.ts`: auth, validate, quota `kind='advice'`,
      Gemini closed schema, validate output
- [ ] `components/coach-card.tsx` + mount in `components/workout-screen.tsx`
- [ ] Docs: `AGENTS.md`, `docs/SUPABASE.md`, `docs/ROADMAP.md`, cross-ref in
      `specs/007-ai-coach/{spec,tasks}.md`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
