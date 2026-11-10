import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const fallbackModels = [
  { id: 'openrouter/free', name: 'OmniRouter', provider: 'openrouter' },
]

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const endpoint = process.env.AQUIN_PROD_ENDPOINT || 'https://aquin.prod.page/v1'
  const apiKey = process.env.OMNIROUTE_API_KEY || process.env.KEY_ENV_NAME
  if (!apiKey) return NextResponse.json({ models: fallbackModels, source: 'fallback' })

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/models`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error('Model discovery unavailable')
    const payload: unknown = await response.json()
    const data = typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data) ? payload.data : []
    const models = data.flatMap((model) => {
      if (typeof model !== 'object' || model === null || !('id' in model) || typeof model.id !== 'string') return []
      return [{ id: model.id, name: 'OmniRouter', provider: 'openrouter' }]
    })
    return NextResponse.json({ models: models.length > 0 ? models : fallbackModels, source: models.length > 0 ? 'omniroute' : 'fallback' })
  } catch {
    return NextResponse.json({ models: fallbackModels, source: 'fallback' })
  }
}
