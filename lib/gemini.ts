const REQUEST_TIMEOUT_MS = 8000

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

export type GeminiSchema = Record<string, unknown>

type GenerateArgs = {
  apiKey: string
  model: string
  system: string
  prompt: string
  schema: GeminiSchema
  timeoutMs?: number
}

export function geminiModel(fallback: string): string {
  return process.env.GEMINI_MODEL?.trim() || fallback
}

export async function generateJson<T>({
  apiKey,
  model,
  system,
  prompt,
  schema,
  timeoutMs = REQUEST_TIMEOUT_MS,
}: GenerateArgs): Promise<T | null> {
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
          parts: [{ text: system }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      console.error('Gemini request failed', response.status)
      return null
    }

    const data = (await response.json()) as GeminiResponse
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()
    if (!text) return null

    return JSON.parse(text) as T
  } catch (error) {
    console.error('Gemini request error', error instanceof Error ? error.message : error)
    return null
  }
}
