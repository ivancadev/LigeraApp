// Grupos asignables a ejercicios. 'Pierna' no está aquí porque solo se usa
// para agrupar resultados en pantalla.
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

// El trabajo de pierna se registra en grupos detallados; 'Pierna' solo combina
// esos grupos al mostrar estadísticas y nunca se asigna directamente.
export const LEG_SUBGROUPS = [
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
] as const satisfies readonly MuscleGroup[]

export const ROLLUP: Record<string, MuscleGroup[]> = {
  Pierna: [...LEG_SUBGROUPS],
}

// Orden de los grupos que aparecen en el selector y en Progress.
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

// Clasificación explícita de ejercicios conocidos; tiene prioridad sobre
// las coincidencias aproximadas de KEYWORDS.
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

// Patrones para reconocer ejercicios con nombres no incluidos en el mapa.
// Si varios patrones coinciden, gana el primero de esta lista.
const KEYWORDS: { group: MuscleGroup; test: RegExp }[] = [
  { group: 'Gemelos', test: /gemelo|pantorrilla|soleo/ },
  { group: 'Isquiotibiales', test: /femoral|isquio/ },
  { group: 'Glúteos', test: /gluteo|hip thrust|puente/ },
  { group: 'Cuádriceps', test: /cuadricep|prensa|sentadilla|zancada/ },
  { group: 'Tríceps', test: /triceps|fondo/ },
  { group: 'Bíceps', test: /biceps|curl/ },
  { group: 'Hombros', test: /militar|hombro|deltoid|elevacion|pajaros|face pull/ },
  { group: 'Espalda', test: /remo|jalon|dominada|dorsal|espalda|pull/ },
  { group: 'Pecho', test: /banca|pecho|cruce|apertura|press inclinado/ },
  { group: 'Core', test: /abdominal|core|plancha|rueda|crunch|oblicuo/ },
]

export function normalizeName(name: string): string {
  // Quita diacríticos y diferencias de mayúsculas para que coincidan nombres
  // con o sin tildes (por ejemplo, "cuádriceps" y "cuadriceps").
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
  // Se respeta este orden: ajuste del usuario, nombre conocido, palabras clave
  // y, si no hay coincidencia, el grupo genérico.
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

// Indica si el nombre se reconoce sin acabar en 'Otros'. El selector usa esto
// para decidir si debe pedir al usuario que elija un grupo muscular.
export function isRecognizedGroup(name: string, overrides?: MuscleOverrides): boolean {
  return muscleGroupFor(name, overrides) !== 'Otros'
}
