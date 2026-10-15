export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
  'Core',
  'Otros',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

// Leg work is tracked across several detailed groups; 'Pierna' is a
// display-only rollup that combines them (never assigned to an exercise).
export const LEG_SUBGROUPS = [
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
] as const satisfies readonly MuscleGroup[]

export const ROLLUP: Record<string, MuscleGroup[]> = {
  Pierna: [...LEG_SUBGROUPS],
}

// What the Progress "By muscle group" list and selector render, in order.
export const DISPLAY_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
  'Pierna',
  'Core',
  'Otros',
] as const

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number]

export const EXERCISE_MUSCLE: Record<string, MuscleGroup> = {
  'Press de Banca': 'Pecho',
  'Remo Apoyado en Pecho': 'Espalda',
  'Press Militar': 'Hombros',
  'Dominadas Lastradas': 'Espalda',
  'Cruces de Polea Alta a Baja': 'Pecho',
  'Sentadilla Trasera': 'Cuádriceps',
  'Peso Muerto Rumano': 'Isquiotibiales',
  'Prensa de Piernas 45°': 'Cuádriceps',
  'Curl Femoral Tumbado': 'Isquiotibiales',
  'Gemelos de Pie en Máquina': 'Gemelos',
  'Press Inclinado con Mancuernas': 'Pecho',
  'Fondos en Paralelas': 'Tríceps',
  'Press de Hombros Sentado': 'Hombros',
  'Elevaciones Laterales en Polea': 'Hombros',
  'Extensiones de Tríceps en Polea Alta': 'Tríceps',
  'Jalón al Pecho': 'Espalda',
  'Remo con Mancuerna a Una Mano': 'Espalda',
  'Face Pulls en Polea': 'Hombros',
  'Curl de Bíceps Inclinado': 'Bíceps',
  'Curl Martillo': 'Bíceps',
  'Zancadas Búlgaras': 'Cuádriceps',
  'Curl Femoral Sentado': 'Isquiotibiales',
  'Extensiones de Cuádriceps': 'Cuádriceps',
  'Gemelos Sentado': 'Gemelos',
  'Rueda Abdominal': 'Core',
}

const KEYWORDS: { group: MuscleGroup; test: RegExp }[] = [
  { group: 'Gemelos', test: /gemelo|pantorrilla|soleo/ },
  { group: 'Isquiotibiales', test: /femoral|isquio/ },
  { group: 'Glúteos', test: /gluteo|hip thrust|puente/ },
  { group: 'Cuádriceps', test: /cuadricep|prensa|sentadilla|zancada/ },
  { group: 'Tríceps', test: /triceps|fondo/ },
  { group: 'Bíceps', test: /biceps|curl/ },
  { group: 'Pecho', test: /banca|pecho|cruce|apertura|press inclinado/ },
  { group: 'Espalda', test: /remo|jalon|dominada|dorsal|espalda|pull/ },
  { group: 'Hombros', test: /militar|hombro|deltoid|elevacion lateral|pajaros|face pull/ },
  { group: 'Core', test: /abdominal|core|plancha|rueda|crunch|oblicuo/ },
]

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export type MuscleOverrides = Map<string, MuscleGroup>

export function muscleGroupFor(
  name: string,
  overrides?: MuscleOverrides,
): MuscleGroup {
  if (overrides) {
    const override = overrides.get(name)
    if (override) return override
  }
  const exact = EXERCISE_MUSCLE[name]
  if (exact) return exact
  const norm = normalizeName(name)
  for (const kw of KEYWORDS) {
    if (kw.test.test(norm)) return kw.group
  }
  return 'Otros'
}

// True when the name resolves to a real muscle (map or keyword), i.e. it would
// not land in the 'Otros' bucket. Used by the picker to decide whether to ask.
export function isRecognizedGroup(name: string, overrides?: MuscleOverrides): boolean {
  return muscleGroupFor(name, overrides) !== 'Otros'
}
