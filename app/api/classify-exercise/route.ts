import { createClient } from '@/lib/supabase/server'
import { MUSCLE_GROUPS, type MuscleGroup } from '@/lib/muscles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const DEFAULT_DAILY_LIMIT = 20
const REQUEST_TIMEOUT_MS = 8000
const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 80

type Classification = {
  muscleGroup: MuscleGroup
  confidence: number
}

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

const SYSTEM_PROMPT = `You classify strength-training exercise names into exactly one muscle group.
The name may be in Spanish, English or a mix.
Choose only from this closed list: ${MUSCLE_GROUPS.join(', ')}.
Use "Otros" only when the name gives no useful anatomical clue.
Return a confidence between 0 and 1.`

function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value)
}

function parseName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const name = (body as { name?: unknown }).name
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) return null
  return trimmed
}

function dailyLimit(): number {
  const parsed = Number.parseInt(process.env.AI_DAILY_LIMIT ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT
}

async function classifyWithGemini(name: string, apiKey: string): Promise<Classification | null> {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [{ role: 'user', parts: [{ text: name }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              muscleGroup: { type: 'STRING', enum: [...MUSCLE_GROUPS] },
              confidence: { type: 'NUMBER' },
            },
            required: ['muscleGroup', 'confidence'],
          },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('Gemini classification failed', response.status)
      return null
    }

    const data = (await response.json()) as GeminiResponse
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()
    if (!text) return null

    const parsed = JSON.parse(text) as { muscleGroup?: unknown; confidence?: unknown }
    if (!isMuscleGroup(parsed.muscleGroup)) return null

    const confidence =
      typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5

    return { muscleGroup: parsed.muscleGroup, confidence }
  } catch (error) {
    console.error(
      'Gemini classification error',
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const name = parseName(body)
  if (!name) {
    return Response.json({ error: 'invalid_name' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ai_not_configured' }, { status: 503 })
  }

  const { data: quota, error: quotaError } = await supabase.rpc('consume_ai_quota', {
    p_daily_limit: dailyLimit(),
  })
  if (quotaError) {
    console.error('AI quota check failed', quotaError.message)
    return Response.json({ error: 'quota_unavailable' }, { status: 503 })
  }

  const quotaResult = quota as { allowed?: boolean; remaining?: number } | null
  if (!quotaResult?.allowed) {
    return Response.json({ error: 'rate_limited', remaining: 0 }, { status: 429 })
  }

  const classification = await classifyWithGemini(name, apiKey)
  if (!classification) {
    return Response.json({ error: 'classification_failed' }, { status: 502 })
  }

  return Response.json(classification)
}
