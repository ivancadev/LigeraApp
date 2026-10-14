# 003 — Lock completed sets (plan)

**Spec:** `specs/003-lock-completed-sets/spec.md`
**Constitution refs:** §3.4

## Files touched

- `components/exercise-card.tsx` — conditional rendering per set + a `Lock` icon.

## Design

- In the set row, when `set.done`:
  - Render kg/reps as `<span className="font-mono …">` instead of `NumberStepper`.
  - Render the RIR badge as a non-interactive span.
  - Omit the remove button.
  - Show a small `Lock` (lucide) glyph near the check.
- The check button keeps its handler (`onToggleSet`) so a second tap unlocks.
- No props change: `set.done` already flows in.

## Migration

None.

## Risks / tradeoffs

- The only way to edit a completed set is to un-complete it first. This is the
  intended safety tradeoff (FR3).

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm build`
