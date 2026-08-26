import { useState, useEffect, useRef } from 'react'
import { createAlertSocket } from '../lib/ws'
import { useAuth } from './useAuth'

/**
 * useLiveFeed — drives the live clock, connection status badge, and new-alert
 * counter in the TopBar, all backed by a real WebSocket connection.
 *
 * Events handled:
 *   new_alert      → increments counter, stores last 10 in liveAlerts ring
 *   status_updated → dispatches `sybrai:status_updated` DOM event so
 *                    useAlerts can patch its in-memory state without re-fetch
 */
export function useLiveFeed() {
  const { token } = useAuth()

  const [currentTime,    setCurrentTime]    = useState(new Date())
  const [newAlertCount,  setNewAlertCount]  = useState(0)
  const [liveAlerts,     setLiveAlerts]     = useState([])   // ring buffer, max 10
  const [wsStatus,       setWsStatus]       = useState('disconnected') // connecting | connected | disconnected

  const socketRef = useRef(null)

  // ── Live clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── WebSocket connection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      // Not logged in — close any existing socket
      socketRef.current?.close()
      socketRef.current = null
      setWsStatus('disconnected')
      return
    }

    function handleMessage(msg) {
      if (msg.event === 'new_alert') {
        setNewAlertCount(c => c + 1)
        setLiveAlerts(prev => [msg.data, ...prev].slice(0, 10))
      } else if (msg.event === 'status_updated') {
        // Let useAlerts patch its own state reactively
        window.dispatchEvent(
          new CustomEvent('sybrai:status_updated', { detail: msg.data })
        )
      }
    }

    socketRef.current = createAlertSocket(token, handleMessage, setWsStatus)

    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [token])

  const clearNewAlerts = () => setNewAlertCount(0)

  // Derive a simple boolean for components that only need on/off
  const isConnected = wsStatus === 'connected'

  return {
    currentTime,
    newAlertCount,
    liveAlerts,
    wsStatus,
    isConnected,
    clearNewAlerts,
  }
}
