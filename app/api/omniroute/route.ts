import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct'
const REQUEST_TIMEOUT_MS = 180_000

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type CompatibleProvider = 'groq' | 'openrouter' | 'cerebras' | 'nvidia'
type Provider = 'cloudflare' | 'gemini' | CompatibleProvider

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash-lite',
] as const

const COMPATIBLE_MODELS: Record<CompatibleProvider, readonly string[]> = {
  groq: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
  openrouter: ['openrouter/free'],
  cerebras: ['gpt-oss-120b', 'qwen-3.8-27b'],
  nvidia: ['nvidia/llama-3.1-nemotron-70b-instruct'],
}

type ChatRequest = {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
}

function isChatMessage(message: unknown): message is ChatMessage {
  return typeof message === 'object'
    && message !== null
    && 'role' in message
    && (message.role === 'system' || message.role === 'user' || message.role === 'assistant')
    && 'content' in message
    && typeof message.content === 'string'
}

function isChatRequest(body: unknown): body is ChatRequest {
  return typeof body === 'object'
    && body !== null
    && !Array.isArray(body)
    && 'provider' in body
    && (body.provider === 'cloudflare'
      || body.provider === 'gemini'
      || body.provider === 'groq'
      || body.provider === 'openrouter'
      || body.provider === 'cerebras'
      || body.provider === 'nvidia')
    && 'model' in body
    && typeof body.model === 'string'
    && body.model.trim().length > 0
    && 'messages' in body
    && Array.isArray(body.messages)
    && body.messages.length > 0
    && body.messages.every(isChatMessage)
}

function getCloudflareConfig(model: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.OMNIROUTE_API_KEY

  if (!accountId || !apiToken) return null

  const selectedModel = model.startsWith('@cf/')
    ? model
    : process.env.CLOUDFLARE_AI_MODEL || DEFAULT_MODEL
  const modelPath = selectedModel.split('/').map((part) => (
    encodeURIComponent(part).replace(/%40/gi, '@')
  )).join('/')
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`

  return { apiToken, url }
}

function isProvider(value: string | null): value is Provider {
  return value === 'cloudflare'
    || value === 'gemini'
    || value === 'groq'
    || value === 'openrouter'
    || value === 'cerebras'
    || value === 'nvidia'
}

function isConfigured(provider: Provider) {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY)
  if (provider === 'cloudflare') return getCloudflareConfig(DEFAULT_MODEL) !== null
  return Boolean(getCompatibleProviderConfig(provider))
}

function getCompatibleProviderConfig(provider: CompatibleProvider) {
  const config = {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      url: 'https://api.groq.com/openai/v1/chat/completions',
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      url: 'https://openrouter.ai/api/v1/chat/completions',
    },
    cerebras: {
      apiKey: process.env.CEREBRAS_API_KEY,
      url: 'https://api.cerebras.ai/v1/chat/completions',
    },
    nvidia: {
      apiKey: process.env.NVIDIA_API_KEY,
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    },
  }[provider]

  return config.apiKey ? { apiKey: config.apiKey, url: config.url } : null
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const providerParam = new URL(request.url).searchParams.get('provider') || 'cloudflare'
  if (!isProvider(providerParam)) {
    return NextResponse.json({ error: 'Unsupported AI provider.' }, { status: 400 })
  }
  const configured = isConfigured(providerParam)
  return NextResponse.json({ configured }, { status: configured ? 200 : 503 })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!isChatRequest(body)) {
    return NextResponse.json(
      { error: 'Request body must include a provider, model, and non-empty messages array.' },
      { status: 400 },
    )
  }

  if (body.provider === 'gemini') {
    return handleGeminiRequest(body)
  }

  if (body.provider !== 'cloudflare') {
    if (!COMPATIBLE_MODELS[body.provider].includes(body.model)) {
      return NextResponse.json({ error: 'Unsupported model for this provider.' }, { status: 400 })
    }

    const config = getCompatibleProviderConfig(body.provider)
    if (!config) {
      return NextResponse.json(
        { error: `${body.provider} is not configured. Add its API key to the server environment.` },
        { status: 503 },
      )
    }

    return handleCompatibleProviderRequest(body, config.url, config.apiKey)
  }

  const config = getCloudflareConfig(body.model)
  if (!config) {
    return NextResponse.json(
      { error: 'AI service is not configured. Check the server environment settings.' },
      { status: 503 },
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: body.messages }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const responseText = await response.text()
    let result: unknown
    try {
      result = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: `AI service returned an invalid response (${response.status}).` },
        { status: response.ok ? 502 : response.status },
      )
    }

    const cloudflareErrors = typeof result === 'object' && result !== null && 'errors' in result
        && Array.isArray(result.errors)
        ? result.errors.map((item) => (
            typeof item === 'object' && item !== null && 'message' in item
              ? String(item.message)
              : ''
          )).filter(Boolean).join('; ')
        : ''
    const unsuccessful = typeof result === 'object' && result !== null
      && 'success' in result && result.success === false
    if (!response.ok || unsuccessful) {
      return NextResponse.json(
        { error: cloudflareErrors || `AI service returned ${response.status}.` },
        { status: response.ok ? 502 : response.status },
      )
    }

    const content = typeof result === 'object' && result !== null && 'result' in result
      && typeof result.result === 'object' && result.result !== null && 'response' in result.result
      && typeof result.result.response === 'string'
      ? result.result.response
      : null
    if (content === null) {
      return NextResponse.json(
        { error: 'AI service returned no text response.' },
        { status: 502 },
      )
    }

    return createEventStreamResponse(content)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      { error: timedOut ? 'AI service request timed out.' : 'AI service is unreachable.' },
      { status: timedOut ? 504 : 502 },
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function handleGeminiRequest(body: ChatRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini is not configured. Add GEMINI_API_KEY to the server environment.' },
      { status: 503 },
    )
  }

  if (!GEMINI_MODELS.some((model) => model === body.model)) {
    return NextResponse.json({ error: 'Unsupported Gemini model.' }, { status: 400 })
  }

  const systemInstruction = body.messages.find((message) => message.role === 'system')?.content
  const conversation = body.messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n')
  if (!conversation) {
    return NextResponse.json(
      { error: 'Add a user message before requesting a Gemini response.' },
      { status: 400 },
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse',
      {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model: body.model,
          input: conversation,
          store: false,
          stream: true,
          ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
        }),
        signal: controller.signal,
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      const responseText = await response.text()
      let error = `Gemini returned ${response.status}.`
      try {
        const result: unknown = JSON.parse(responseText)
        if (typeof result === 'object' && result !== null && 'error' in result
          && typeof result.error === 'object' && result.error !== null && 'message' in result.error) {
          error = String(result.error.message)
        }
      } catch {
        if (responseText) error = responseText.slice(0, 500)
      }
      clearTimeout(timeout)
      return NextResponse.json({ error }, { status: response.status })
    }

    if (!response.body) {
      clearTimeout(timeout)
      return NextResponse.json(
        { error: 'Gemini returned an empty response stream.' },
        { status: 502 },
      )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let buffer = ''
    let finished = false

    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const emit = (data: unknown) => {
          streamController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        const emitDone = () => {
          streamController.enqueue(encoder.encode('data: [DONE]\n\n'))
        }

        const processFrame = (frame: string) => {
          const data = frame.split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n')
          if (!data) return

          const event: unknown = JSON.parse(data)
          if (typeof event !== 'object' || event === null) return
          if ('error' in event) {
            const error = typeof event.error === 'object' && event.error !== null
              && 'message' in event.error
              ? String(event.error.message)
              : 'Gemini stream failed.'
            emit({ error })
            finished = true
            return
          }
          if (!('event_type' in event)) return

          if (event.event_type === 'step.delta'
            && 'delta' in event
            && typeof event.delta === 'object' && event.delta !== null
            && 'type' in event.delta && event.delta.type === 'text'
            && 'text' in event.delta && typeof event.delta.text === 'string') {
            emit({ choices: [{ delta: { content: event.delta.text } }] })
          } else if (event.event_type === 'interaction.completed') {
            finished = true
          }
        }

        const pump = async () => {
          try {
            while (!finished) {
              const { done, value } = await reader.read()
              if (done) {
                buffer += decoder.decode()
                if (buffer.trim()) processFrame(buffer)
                break
              }

              buffer += decoder.decode(value, { stream: true })
              let frameMatch = /\r?\n\r?\n/.exec(buffer)
              while (frameMatch && !finished) {
                processFrame(buffer.slice(0, frameMatch.index))
                buffer = buffer.slice(frameMatch.index + frameMatch[0].length)
                frameMatch = /\r?\n\r?\n/.exec(buffer)
              }
            }

            emitDone()
            streamController.close()
          } catch (error) {
            const message = controller.signal.aborted
              ? 'Gemini request timed out.'
              : error instanceof Error ? error.message : 'Gemini stream failed.'
            emit({ error: message })
            emitDone()
            streamController.close()
          } finally {
            clearTimeout(timeout)
            reader.releaseLock()
          }
        }

        void pump()
      },
      async cancel() {
        clearTimeout(timeout)
        await reader.cancel()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (error) {
    clearTimeout(timeout)
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      { error: timedOut ? 'Gemini request timed out.' : 'Gemini is unreachable.' },
      { status: timedOut ? 504 : 502 },
    )
  }
}

async function handleCompatibleProviderRequest(
  body: ChatRequest,
  url: string,
  apiKey: string,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        stream: true,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      const responseText = await response.text()
      let errorMessage = `AI provider returned ${response.status}.`
      try {
        const result: unknown = JSON.parse(responseText)
        if (typeof result === 'object' && result !== null && 'error' in result) {
          const error = result.error
          if (typeof error === 'string') {
            errorMessage = error
          } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = String(error.message)
          }
        }
      } catch {
        if (responseText) errorMessage = responseText.slice(0, 500)
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json(
        { error: 'AI provider returned an empty response stream.' },
        { status: 502 },
      )
    }

    const reader = response.body.getReader()
    const encoder = new TextEncoder()
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const emit = (data: unknown) => {
          streamController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        const emitDone = () => {
          streamController.enqueue(encoder.encode('data: [DONE]\n\n'))
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              streamController.enqueue(value)
            }
            streamController.close()
          } catch (error) {
            if (!cancelled) {
              emit({
                error: controller.signal.aborted
                  ? 'AI provider request timed out.'
                  : error instanceof Error ? error.message : 'AI provider stream failed.',
              })
              emitDone()
              streamController.close()
            }
          } finally {
            clearTimeout(timeout)
            reader.releaseLock()
          }
        }

        void pump()
      },
      async cancel() {
        cancelled = true
        controller.abort()
        clearTimeout(timeout)
        await reader.cancel()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (error) {
    clearTimeout(timeout)
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      { error: timedOut ? 'AI provider request timed out.' : 'AI provider is unreachable.' },
      { status: timedOut ? 504 : 502 },
    )
  }
}

function createEventStreamResponse(content: string) {
  const eventStream = [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`,
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n')
  return new Response(eventStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
