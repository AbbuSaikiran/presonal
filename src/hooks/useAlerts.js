import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchAlerts, fetchAlertById, patchAlertStatus } from '../lib/api'

const PAGE_SIZE = 10

/**
 * useAlerts — fetches paginated, filtered, sorted alerts from the real API.
 *
 * Falls back to an empty state while loading, and exposes `error` for
 * the UI to show an error banner if the API is unreachable.
 *
 * Also listens for `sybrai:status_updated` DOM events (dispatched by
 * useLiveFeed when a WS message arrives) so the table stays in sync
 * without a full re-fetch.
 */
export function useAlerts() {
  // Filter / sort / pagination state
  const [searchQuery, setSearchQueryRaw]  = useState('')
  const [riskFilter,  setRiskFilterRaw]   = useState('ALL')
  const [statusFilter, setStatusFilterRaw] = useState('ALL')
  const [sortConfig,  setSortConfig]      = useState({ key: 'timestamp', dir: 'desc' })
  const [currentPage, setCurrentPageRaw]  = useState(1)

  // Data state
  const [alerts,     setAlerts]     = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState(null)

  // Cache of individual alerts by ID (to avoid extra fetches for detail view)
  const alertCache = useRef({})

  // ---------------------------------------------------------------------------
  // Helpers that also reset page to 1
  // ---------------------------------------------------------------------------

  const setSearchQuery = useCallback((q) => {
    setSearchQueryRaw(q)
    setCurrentPageRaw(1)
  }, [])

  const setRiskFilter = useCallback((f) => {
    setRiskFilterRaw(f)
    setCurrentPageRaw(1)
  }, [])

  const setStatusFilter = useCallback((f) => {
    setStatusFilterRaw(f)
    setCurrentPageRaw(1)
  }, [])

  const setCurrentPage = useCallback((p) => setCurrentPageRaw(p), [])

  const handleSort = useCallback((key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    )
    setCurrentPageRaw(1)
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch from API whenever params change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchAlerts({
      page:   currentPage,
      limit:  PAGE_SIZE,
      risk:   riskFilter,
      status: statusFilter,
      q:      searchQuery,
      sort:   sortConfig.key,
      dir:    sortConfig.dir,
    })
      .then(data => {
        if (cancelled) return
        setAlerts(data.alerts)
        setTotalCount(data.total)
        setTotalPages(data.total_pages)
        // Update cache
        data.alerts.forEach(a => { alertCache.current[a.id] = a })
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [currentPage, riskFilter, statusFilter, searchQuery, sortConfig])

  // ---------------------------------------------------------------------------
  // Listen for WS status_updated events from useLiveFeed
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleStatusUpdate(e) {
      const { id, status } = e.detail
      // Patch in-memory list
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      // Patch cache
      if (alertCache.current[id]) {
        alertCache.current[id] = { ...alertCache.current[id], status }
      }
    }
    window.addEventListener('sybrai:status_updated', handleStatusUpdate)
    return () => window.removeEventListener('sybrai:status_updated', handleStatusUpdate)
  }, [])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const updateAlertStatus = useCallback(async (id, newStatus) => {
    try {
      const updated = await patchAlertStatus(id, newStatus)
      setAlerts(prev => prev.map(a => a.id === id ? updated : a))
      alertCache.current[id] = updated
    } catch (err) {
      console.error('Failed to update alert status:', err)
      throw err
    }
  }, [])

  const getAlertById = useCallback(async (id) => {
    // Check in-memory list first, then cache, then API
    const inList = alerts.find(a => a.id === id)
    if (inList) return inList
    if (alertCache.current[id]) return alertCache.current[id]

    try {
      const data = await fetchAlertById(id)
      alertCache.current[id] = data
      return data
    } catch {
      return null
    }
  }, [alerts])

  return {
    alerts,
    totalCount,
    currentPage,
    totalPages,
    searchQuery,
    riskFilter,
    statusFilter,
    sortConfig,
    isLoading,
    error,
    setSearchQuery,
    setRiskFilter,
    setStatusFilter,
    setCurrentPage,
    handleSort,
    updateAlertStatus,
    getAlertById,
  }
}
