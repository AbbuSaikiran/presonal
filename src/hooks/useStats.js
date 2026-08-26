import { useState, useEffect } from 'react'
import { fetchStats, fetchTrend, fetchTopSources } from '../lib/api'

/**
 * useStats — fetches dashboard KPIs, threat trend, and top sources from the API.
 *
 * Re-fetches on a configurable interval (default 60 s) so the KPIs stay
 * reasonably fresh without a full page reload.
 */
export function useStats({ refreshIntervalMs = 60_000 } = {}) {
  const [stats,      setStats]      = useState(null)
  const [trend,      setTrend]      = useState([])
  const [topSources, setTopSources] = useState([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)

  async function load() {
    setError(null)
    try {
      const [s, t, ts] = await Promise.all([
        fetchStats(),
        fetchTrend(),
        fetchTopSources(),
      ])
      setStats(s)
      setTrend(t)
      setTopSources(ts)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (refreshIntervalMs > 0) {
      const id = setInterval(load, refreshIntervalMs)
      return () => clearInterval(id)
    }
  }, [refreshIntervalMs])

  return { stats, trend, topSources, isLoading, error, refresh: load }
}
