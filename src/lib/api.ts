const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('blackjack_token')
}

export function setToken(token: string) {
  localStorage.setItem('blackjack_token', token)
}

export function clearToken() {
  localStorage.removeItem('blackjack_token')
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? 'Request failed')
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}

// SSE helper using fetch + ReadableStream (supports Authorization header)
export interface SSEConnection {
  close: () => void
}

export function connectSSE(
  path: string,
  handlers: Record<string, (data: unknown) => void>,
  onError?: (err: Error) => void
): SSEConnection {
  const controller = new AbortController()
  const token = getToken()

  const url = `${API_BASE}${path}`

  async function connect() {
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        onError?.(new Error(`SSE connection failed: ${res.status}`))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE frames
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Keep incomplete line in buffer

        let currentEvent = 'message'

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              handlers[currentEvent]?.(parsed)
            } catch {
              // Non-JSON data, ignore
            }
            currentEvent = 'message'
          }
          // Ignore comments (lines starting with :) and empty lines
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError?.(err as Error)
        // Auto-reconnect after 3 seconds
        if (!controller.signal.aborted) {
          setTimeout(connect, 3000)
        }
      }
    }
  }

  connect()

  return {
    close: () => controller.abort(),
  }
}
