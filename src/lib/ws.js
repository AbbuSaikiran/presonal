/**
 * ws.js — Sybrai WebSocket client
 *
 * Creates an authenticated WebSocket connection to /ws/alerts.
 * Handles:
 *  - Initial connect + JWT auth via ?token= query param
 *  - Auto-reconnect with exponential back-off (1 s → 30 s)
 *  - Ping/pong keepalive (server sends ping every 30 s)
 *  - Clean close on logout
 *
 * Usage:
 *   const socket = createAlertSocket(token, onMessage, onStatusChange)
 *   // later:
 *   socket.close()
 */

const WS_BASE = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000')

const MIN_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

/**
 * @param {string}   token          — JWT access token
 * @param {Function} onMessage      — called with the parsed message object
 * @param {Function} onStatusChange — called with 'connecting' | 'connected' | 'disconnected'
 * @returns {{ close: () => void }}
 */
export function createAlertSocket(token, onMessage, onStatusChange) {
  let ws = null
  let closed = false          // set to true when close() is called intentionally
  let delay = MIN_DELAY_MS
  let reconnectTimer = null

  function connect() {
    if (closed) return

    onStatusChange?.('connecting')
    const url = `${WS_BASE}/ws/alerts?token=${encodeURIComponent(token)}`

    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.warn('[WS] Failed to construct WebSocket:', err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      delay = MIN_DELAY_MS          // reset back-off on success
      onStatusChange?.('connected')
      console.info('[WS] Connected to /ws/alerts')
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)

        // Respond to server pings with a pong so the keepalive loop knows
        // we're still here (server ignores the content anyway).
        if (msg.event === 'ping') {
          ws?.readyState === WebSocket.OPEN &&
            ws.send(JSON.stringify({ action: 'pong' }))
          return
        }

        onMessage?.(msg)
      } catch (err) {
        console.warn('[WS] Failed to parse message:', err)
      }
    }

    ws.onerror = (err) => {
      console.warn('[WS] Error:', err)
    }

    ws.onclose = (evt) => {
      onStatusChange?.('disconnected')
      console.info(`[WS] Closed (code=${evt.code}). Reconnecting in ${delay / 1000}s …`)
      if (!closed) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (closed) return
    reconnectTimer = setTimeout(() => {
      // Exponential back-off: double each attempt, cap at MAX
      delay = Math.min(delay * 2, MAX_DELAY_MS)
      connect()
    }, delay)
  }

  // Initial connection
  connect()

  return {
    /** Permanently close the socket (no further reconnect). */
    close() {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null   // suppress the reconnect handler
        ws.close(1000, 'Client closed')
      }
      onStatusChange?.('disconnected')
    },
  }
}
