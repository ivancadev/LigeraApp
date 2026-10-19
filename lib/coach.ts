import { bestPerWorkout, muscleGroupStats } from '@/lib/stats'
import {
  DISPLAY_GROUPS,
  type MuscleGroup,
  type MuscleOverrides,
} from '@/lib/muscles'
import type { Workout } from '@/lib/data'

export const COACH_WINDOW_DAYS = 28
const MIN_SESSIONS = 2
const STALL_POINTS = 3
const IMBALANCE_RATIO = 1.5
const INACTIVE_DAYS = 10
const DELOAD_WEEKS = 6
const MAX_SIGNALS = 6
const DAY_MS = 24 * 60 * 60 * 1000

export const COACH_SIGNAL_KINDS = ['plateau', 'imbalance', 'inactive', 'deload'] as const
export type CoachSignalKind = (typeof COACH_SIGNAL_KINDS)[number]

export const COACH_DETAILS = [
  'plateau-exercise',
  'imbalance-push-pull',
  'imbalance-quad-posterior',
  'inactive-group',
  'deload-suggested',
] as const
export type CoachDetail = (typeof COACH_DETAILS)[number]

export type CoachSignal = {
  kind: CoachSignalKind
  detail: CoachDetail
  group?: MuscleGroup
  exercise?: string
  value?: number
}

export type CoachSummary = {
  windowDays: number
  sessions: number
  signals: CoachSignal[]
}

export const ADVICE_SEVERITIES = ['ok', 'watch', 'act'] as const
export type AdviceSeverity = (typeof ADVICE_SEVERITIES)[number]

export type TrainingAdvice = {
  severity: AdviceSeverity
  headline: string
  body: string
  actions: string[]
}

function timeOf(iso: string): number {
  return new Date(iso).getTime()
}

function loggedWorkouts(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.exercises.some((ex) => ex.sets.length > 0))
}

function sumVolumes(volume: Map<MuscleGroup, number>, groups: MuscleGroup[]): number {
  return groups.reduce((total, group) => total + (volume.get(group) ?? 0), 0)
}

export function buildCoachSignals(
  workouts: Workout[],
  overrides?: MuscleOverrides,
): CoachSignal[] {
  const logged = loggedWorkouts(workouts)
  if (logged.length < MIN_SESSIONS) return []

  const now = Date.now()
  const cutoff = now - COACH_WINDOW_DAYS * DAY_MS
  const signals: CoachSignal[] = []

  const names = new Set<string>()
  for (const w of logged) {
    for (const ex of w.exercises) {
      if (ex.sets.length > 0) names.add(ex.name)
    }
  }

  const plateaus: { name: string; change: number }[] = []
  for (const name of names) {
    const points = bestPerWorkout(logged, name).filter((p) => timeOf(p.date) >= cutoff)
    if (points.length < STALL_POINTS) continue
    const recent = points.slice(-STALL_POINTS)
    const change = recent[recent.length - 1].value - recent[0].value
    if (change <= 0) plateaus.push({ name, change })
  }
  plateaus.sort((a, b) => a.change - b.change)
  for (const plateau of plateaus.slice(0, 3)) {
    signals.push({
      kind: 'plateau',
      detail: 'plateau-exercise',
      exercise: plateau.name,
      value: Math.round(plateau.change),
    })
  }

  const summaries = muscleGroupStats(logged, overrides)
  const volume = new Map<MuscleGroup, number>()
  for (const summary of summaries) {
    if (summary.group === 'Pierna') continue
    volume.set(summary.group as MuscleGroup, summary.volume)
  }

  const push = sumVolumes(volume, ['Pecho', 'Hombros', 'Tríceps'])
  const pull = sumVolumes(volume, ['Espalda', 'Bíceps'])
  if (push > 0 && pull > 0) {
    const ratio = push / pull
    if (ratio > IMBALANCE_RATIO || ratio < 1 / IMBALANCE_RATIO) {
      signals.push({
        kind: 'imbalance',
        detail: 'imbalance-push-pull',
        value: Math.round(ratio * 100) / 100,
      })
    }
  }

  const quads = sumVolumes(volume, ['Cuádriceps'])
  const posterior = sumVolumes(volume, ['Isquiotibiales', 'Glúteos'])
  if (quads > 0 && posterior > 0) {
    const ratio = quads / posterior
    if (ratio > IMBALANCE_RATIO || ratio < 1 / IMBALANCE_RATIO) {
      signals.push({
        kind: 'imbalance',
        detail: 'imbalance-quad-posterior',
        value: Math.round(ratio * 100) / 100,
      })
    }
  }

  const inactive: CoachSignal[] = []
  for (const group of DISPLAY_GROUPS) {
    if (group === 'Pierna' || group === 'Otros') continue
    const summary = summaries.find((s) => s.group === group)
    if (!summary || summary.sets === 0 || !summary.lastDate) continue
    const days = Math.floor((now - timeOf(summary.lastDate)) / DAY_MS)
    if (days >= INACTIVE_DAYS) {
      inactive.push({
        kind: 'inactive',
        detail: 'inactive-group',
        group: group as MuscleGroup,
        value: days,
      })
    }
  }
  inactive.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  signals.push(...inactive.slice(0, 2))

  if (plateaus.length >= 2) {
    const times = logged.map((w) => timeOf(w.date))
    const weeks = (Math.max(...times) - Math.min(...times)) / (7 * DAY_MS)
    if (weeks >= DELOAD_WEEKS) {
      signals.push({ kind: 'deload', detail: 'deload-suggested', value: Math.floor(weeks) })
    }
  }

  const rank: Record<CoachSignalKind, number> = {
    deload: 0,
    plateau: 1,
    imbalance: 2,
    inactive: 3,
  }
  return signals.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, MAX_SIGNALS)
}

export function summarizeSignals(workouts: Workout[], signals: CoachSignal[]): CoachSummary {
  const cutoff = Date.now() - COACH_WINDOW_DAYS * DAY_MS
  const sessions = loggedWorkouts(workouts).filter((w) => timeOf(w.date) >= cutoff).length
  return { windowDays: COACH_WINDOW_DAYS, sessions, signals }
}

export function signalLabel(signal: CoachSignal): string {
  switch (signal.detail) {
    case 'plateau-exercise':
      return `Plateau · ${signal.exercise}`
    case 'imbalance-push-pull':
      return 'Push/pull imbalance'
    case 'imbalance-quad-posterior':
      return 'Quad/posterior imbalance'
    case 'inactive-group':
      return `Inactive · ${signal.group}`
    case 'deload-suggested':
      return 'Deload due'
  }
}

export function localAdvice(signals: CoachSignal[]): TrainingAdvice {
  if (signals.length === 0) {
    return {
      severity: 'ok',
      headline: 'Sigue así',
      body: 'No detecto estancamientos ni desequilibrios claros. Mantén la doble progresión y registra cada serie con su RIR.',
      actions: [
        'Registra todas las series con kg, reps y RIR',
        'Deja 1–2 repeticiones en reserva salvo en aislamientos',
      ],
    }
  }

  const parts: string[] = []
  const actions: string[] = []
  for (const signal of signals) {
    switch (signal.detail) {
      case 'plateau-exercise':
        parts.push(`${signal.exercise} no mejora su 1RM estimado en las últimas 3 sesiones.`)
        actions.push(`En ${signal.exercise}, sube 2.5 kg bajando 1 repetición o añade una serie.`)
        break
      case 'imbalance-push-pull':
        parts.push('El volumen de empuje y el de tirón están desequilibrados.')
        actions.push('Equilibra empuje y tirón con una serie extra de remo o jalón.')
        break
      case 'imbalance-quad-posterior':
        parts.push('Hay desequilibrio entre cuádriceps y cadena posterior.')
        actions.push('Añade una serie de femoral o peso muerto rumano.')
        break
      case 'inactive-group':
        parts.push(`${signal.group} lleva más de 10 días sin trabajarse.`)
        actions.push(`Vuelve a incluir ${signal.group} esta semana.`)
        break
      case 'deload-suggested':
        parts.push('Llevas semanas entrenando sin nuevas marcas.')
        actions.push('Plantea una semana de descarga bajando el volumen ~40%.')
        break
    }
  }

  const severity: AdviceSeverity = signals.some((s) => s.kind === 'deload') ? 'act' : 'watch'
  return { severity, headline: 'Consejo de hoy', body: parts.join(' '), actions: actions.slice(0, 3) }
}
