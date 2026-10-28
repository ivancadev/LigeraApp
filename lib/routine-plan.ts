import { MUSCLE_GROUPS, type MuscleGroup } from '@/lib/muscles'

export const ROUTINE_PLAN_LIMITS = {
  maxDays: 7,
  maxExercisesPerDay: 15,
  maxPlanTitleLength: 100,
  maxDayTitleLength: 100,
  maxExerciseNameLength: 80,
  maxNoteLength: 200,
  maxRirLength: 12,
  minSets: 1,
  maxSets: 10,
  minReps: 1,
  maxReps: 50,
} as const

export type RoutinePlanExercise = {
  name: string
  sets: number
  repsMin: number
  repsMax: number
  rir: string | null
  note: string | null
  bodyweight: boolean
  muscleGroup: MuscleGroup
}

export type RoutinePlanDay = {
  title: string
  exercises: RoutinePlanExercise[]
}

export type RoutinePlan = {
  title: string
  days: RoutinePlanDay[]
}

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = {
  role: ChatRole
  content: string
  table?: RoutinePlan | null
}

export type ChatReply = {
  reply: string
  table: RoutinePlan | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value)
}

function toInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function nullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, maxLength) || null
}

export function routinePlanHasDays(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.days) && value.days.length > 0
}

export function sanitizeRoutinePlan(value: unknown): RoutinePlan | null {
  if (!isRecord(value)) return null

  const daysValue = value.days
  if (
    !Array.isArray(daysValue) ||
    daysValue.length < 1 ||
    daysValue.length > ROUTINE_PLAN_LIMITS.maxDays
  ) {
    return null
  }

  const days: RoutinePlanDay[] = []
  for (const dayValue of daysValue) {
    if (!isRecord(dayValue)) return null

    const title = text(dayValue.title, ROUTINE_PLAN_LIMITS.maxDayTitleLength)
    if (!title) return null

    const exercisesValue = dayValue.exercises
    if (
      !Array.isArray(exercisesValue) ||
      exercisesValue.length < 1 ||
      exercisesValue.length > ROUTINE_PLAN_LIMITS.maxExercisesPerDay
    ) {
      return null
    }

    const exercises: RoutinePlanExercise[] = []
    for (const exerciseValue of exercisesValue) {
      if (!isRecord(exerciseValue)) return null

      const name = text(exerciseValue.name, ROUTINE_PLAN_LIMITS.maxExerciseNameLength)
      if (!name) return null

      const sets = toInteger(exerciseValue.sets)
      if (sets === null || sets < ROUTINE_PLAN_LIMITS.minSets || sets > ROUTINE_PLAN_LIMITS.maxSets) {
        return null
      }

      const repsMin = toInteger(exerciseValue.repsMin)
      if (
        repsMin === null ||
        repsMin < ROUTINE_PLAN_LIMITS.minReps ||
        repsMin > ROUTINE_PLAN_LIMITS.maxReps
      ) {
        return null
      }

      const repsMax = toInteger(exerciseValue.repsMax)
      if (
        repsMax === null ||
        repsMax < repsMin ||
        repsMax > ROUTINE_PLAN_LIMITS.maxReps
      ) {
        return null
      }

      const rir = nullableText(exerciseValue.rir, ROUTINE_PLAN_LIMITS.maxRirLength)
      if (rir === undefined) return null

      const note = nullableText(exerciseValue.note, ROUTINE_PLAN_LIMITS.maxNoteLength)
      if (note === undefined) return null

      if (!isMuscleGroup(exerciseValue.muscleGroup)) return null

      exercises.push({
        name,
        sets,
        repsMin,
        repsMax,
        rir,
        note,
        bodyweight: exerciseValue.bodyweight === true,
        muscleGroup: exerciseValue.muscleGroup,
      })
    }

    days.push({ title, exercises })
  }

  return {
    title: text(value.title, ROUTINE_PLAN_LIMITS.maxPlanTitleLength) || 'Generated table',
    days,
  }
}
