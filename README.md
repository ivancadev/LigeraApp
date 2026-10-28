<div align="center">
  <img src="public/icons/icon-512.png" alt="Ligera" width="112" />

  # Ligera

  **Tracker de entrenamiento mobile-first para una rutina avanzada de 5 días.**

  Registra series con kg, reps y RIR, revisa tu progreso y deja que el coach IA
  te ayude a planificar. Instalable como PWA, pensada para usarse en el gimnasio.

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
  ![React](https://img.shields.io/badge/React-19-149eca?logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss)
  ![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase)
  ![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8)
</div>

## Qué es Ligera

Ligera es una PWA personal para seguir una rutina de fuerza de 5 días. Cada
sesión se guarda en Supabase de forma atómica y queda disponible en el historial
y en las gráficas de progreso.

La app está diseñada para móvil: tema oscuro, estructura de teléfono, navegación
inferior con cuatro pestañas y entrada rápida de pesos.

## Características

- **Entrenamiento guiado**: empieza un día de rutina o añade ejercicios a mano.
- **Series con kg / reps / RIR**: steppers de 2.5 kg, reps enteras y RIR de 0 a 3.
- **Rutinas editables**: crea, renombra y elimina días y ejercicios; los cambios
  se guardan por usuario.
- **Historial**: sesiones pasadas con duración, volumen, series y nombre del día.
- **Progreso**: 1RM estimado con fórmula de Epley, récords personales y volumen
  por ejercicio o por grupo muscular.
- **Coach IA**: consejo de entrenamiento antes de la sesión y chat para generar
  tablas de rutina, siempre con vista previa y confirmación antes de guardar.
- **PWA**: manifest, service worker e iconos para instalar en el móvil.
- **Multiusuario**: autenticación con Supabase y datos aislados por usuario con RLS.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, lucide-react |
| Lenguaje | TypeScript 5.7 |
| Gráficas | Recharts |
| Backend | Supabase (Auth + Postgres) |
| IA | Google Gemini, solo desde rutas de servidor |
| Paquete | pnpm 12 |

## Capturas

<!--
Cuando añadas las imágenes en docs/screenshots/, descomenta esta tabla:

| Workout | Routines | History |
| --- | --- | --- |
| ![Workout](docs/screenshots/workout.png) | ![Routines](docs/screenshots/routines.png) | ![History](docs/screenshots/history.png) |

| Progress | Coach IA |
| --- | --- |
| ![Progress](docs/screenshots/progress.png) | ![Coach](docs/screenshots/coach.png) |
-->

## Estructura del proyecto

```text
app/
  layout.tsx             layout raíz, PWA y fuentes
  page.tsx               sesión + router de pestañas
  api/                   rutas de IA (classify, advice, chat)
components/              pantallas y controles de la app
  ui/                    primitivas de shadcn/ui
lib/
  auth.ts                sesión y acciones de autenticación
  data.ts                workouts, RPCs de guardado y hook useWorkouts
  routines.ts            rutinas editables y hook useRoutines
  exercises.ts           biblioteca de ejercicios y useExercises
  stats.ts               1RM, PRs, progreso y estadísticas por grupo
  muscles.ts             grupos musculares y mapeo de ejercicios
  ai.ts                  llamadas a las rutas de IA
  coach.ts               motor local de señales de entrenamiento
  supabase/              clientes de navegador y servidor
supabase/migrations/     migraciones SQL ordenadas
docs/                    constitución, Supabase, roadmap
specs/                   specs por funcionalidad (flujo spec-first)
scripts/                 generación de iconos
public/                  manifest, service worker e iconos
```

## Empezar

### Requisitos

- Node.js 20.9 o superior.
- pnpm 12 (`corepack enable` o `npm i -g pnpm`).
- Un proyecto de Supabase.

### 1. Clonar e instalar

```bash
git clone https://github.com/ivardev33/LigeraApp.git
cd LigeraApp
pnpm install
```

### 2. Configurar variables de entorno

```powershell
Copy-Item .env.example .env.local
```

```bash
cp .env.example .env.local
```

Completa como mínimo `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`.

### 3. Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre el **SQL Editor**.
3. Ejecuta las migraciones de `supabase/migrations/` **en orden**, de `0001` a
   `0011`. Cada archivo se pega completo y se ejecuta una sola vez.

No hay CLI de Supabase enlazada al repo: las migraciones se aplican a mano.

### 4. Arrancar

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) y crea una cuenta.

### Verificación

```bash
pnpm exec tsc --noEmit
pnpm build
```

`pnpm build` es la puerta de despliegue. No existe script de lint.

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anónima; es pública por diseño |
| `GEMINI_API_KEY` | No | Clave de Gemini, solo en el servidor |
| `GEMINI_MODEL` | No | Modelo de Gemini; por defecto `gemini-3.1-flash-lite` |
| `AI_DAILY_LIMIT` | No | Peticiones IA por usuario y día; por defecto `20` |

`.env.example` también incluye variables opcionales para tooling/MCP
(`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL`,
`GITHUB_PERSONAL_ACCESS_TOKEN`). La app no las necesita para funcionar.

## Base de datos

Tablas principales:

| Tabla | Contenido |
| --- | --- |
| `profiles` | Usuario y nombre visible |
| `workouts` | Sesión, fecha, duración y nombre del día |
| `workout_exercises` | Ejercicios de cada sesión |
| `workout_sets` | kg, reps, posición y RIR de cada serie |
| `routines` | Días de rutina editables por usuario |
| `routine_exercises` | Ejercicios y objetivos de cada día |
| `exercises` | Biblioteca de ejercicios por usuario |
| `ai_requests` | Registro de cuota IA, sin datos de entrenamiento |

Todas las tablas tienen RLS activado y acceso owner-only, resolviendo la
propiedad mediante `auth.uid()`. La única lectura compartida es el nombre de
usuario en `profiles`.

Escrituras clave mediante RPC atómicas:

- `log_workout`: guarda una sesión completa.
- `update_logged_workout`: edita una sesión existente.
- `rename_exercise`: propaga un renombrado a rutinas e historial.
- `consume_ai_quota`: controla la cuota diaria de IA.
- `save_generated_routines`: guarda tablas generadas por el coach.

### Migraciones

| Archivo | Contenido |
| --- | --- |
| `0001_init.sql` | Esquema base, RLS y trigger de perfil |
| `0002_rir.sql` | RIR por serie |
| `0003_routines.sql` | Rutinas editables y `log_workout` |
| `0004_edit_workout.sql` | Edición atómica de sesiones |
| `0005_exercise_library.sql` | Biblioteca de ejercicios y renombrado |
| `0006_workout_name.sql` | Nombre del día en cada sesión |
| `0007_routine_position_integrity.sql` | Integridad de posiciones |
| `0008_function_grants.sql` | Permisos de ejecución de RPCs |
| `0009_ai_requests.sql` | Cuota de IA |
| `0010_consume_ai_quota_kind.sql` | Cuota compartida por tipo |
| `0011_save_generated_routines.sql` | Guardado de tablas generadas |

## IA y privacidad

Las funciones de IA son opcionales y solo se ejecutan cuando el usuario las
pide. Todo pasa por rutas de servidor que autentican la sesión y consumen cuota:

- **Clasificación de ejercicios**: solo sale el nombre del ejercicio.
- **Consejo de entrenamiento**: solo sale un resumen de señales calculadas en el
  dispositivo; sin fechas ni listas de series.
- **Chat del coach**: solo salen los últimos 8 mensajes y los nombres/grupos de
  la biblioteca de ejercicios.

Los entrenamientos, pesos, fechas y conversaciones no se envían ni se almacenan
en `ai_requests`. La cuota diaria es compartida entre las tres funciones.

## Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build de producción |
| `pnpm exec tsc --noEmit` | Typecheck sin emitir archivos |

## Spec-first

El proyecto sigue un flujo guiado por especificaciones:

```text
docs/constitution.md -> specs/NNN-feature/spec.md -> plan.md -> tasks.md -> código
```

La constitución es la fuente de verdad. Las specs se escriben antes del código y
se mantienen actualizadas cuando una funcionalidad cambia.

- [Constitución](docs/constitution.md)
- [Supabase](docs/SUPABASE.md)
- [Roadmap](docs/ROADMAP.md)
- [Specs](specs/)

## Limitaciones y roadmap

- **Online-only**: los datos no se cachean para uso offline; la PWA solo cachea
  assets estáticos.
- Sin agregación de RIR en progreso (pendiente).
- Roadmap: competición entre amigos con ranking semanal, login con Google,
  reordenar ejercicios y días, y recordatorio de descarga.

## Seguridad

- Nunca subas `.env.local`; `.env*` está ignorado salvo `.env.example`.
- La clave anónima de Supabase es pública por diseño; la clave `service_role`
  nunca debe usarse en el cliente.
- `GEMINI_API_KEY` es exclusiva del servidor.
- Si una escritura falla, la app muestra un error visible; no falla en silencio.

## Licencia

Proyecto personal. No se incluye una licencia de código abierto; todos los
derechos reservados.
