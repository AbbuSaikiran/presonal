import {
  ShieldAlert, Zap, Clock, Server,
  Eye, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { useAlerts } from '../hooks/useAlerts'
import { useStats }  from '../hooks/useStats'
import StatCard        from '../components/ui/StatCard'
import AlertsTable     from '../components/ui/AlertsTable'
import AlertFilters    from '../components/ui/AlertFilters'
import ThreatTrendChart from '../components/ui/ThreatTrendChart'
import TopSourcesPanel  from '../components/ui/TopSourcesPanel'

// ---------------------------------------------------------------------------
// Stat skeleton (shown while stats are loading)
// ---------------------------------------------------------------------------
function StatSkeleton() {
  return (
    <div className="cyber-card-glow p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-[#1a2d45]" />
        <div className="w-12 h-5 rounded bg-[#1a2d45]" />
      </div>
      <div>
        <div className="w-16 h-7 rounded bg-[#1a2d45]" />
        <div className="w-28 h-3 rounded bg-[#1a2d45] mt-2" />
        <div className="w-20 h-3 rounded bg-[#1a2d45] mt-1" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const {
    alerts,
    totalCount,
    currentPage,
    totalPages,
    searchQuery,
    riskFilter,
    statusFilter,
    sortConfig,
    isLoading: alertsLoading,
    error: alertsError,
    setSearchQuery,
    setRiskFilter,
    setStatusFilter,
    setCurrentPage,
    handleSort,
  } = useAlerts()

  const {
    stats,
    trend,
    topSources,
    isLoading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useStats()

  return (
    <div className="space-y-6">
      {/* ── KPI Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : statsError ? (
          <div className="col-span-4 flex items-center gap-3 p-4 rounded-xl bg-[#ff336610] border border-[#ff336630] text-[#ff3366] text-sm">
            <AlertTriangle size={16} />
            <span>Could not load stats: {statsError}</span>
            <button
              onClick={refreshStats}
              className="ml-auto flex items-center gap-1.5 text-xs cyber-btn py-1 px-3"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <>
            <StatCard
              icon={ShieldAlert}
              label="Critical Open"
              value={stats?.critical_open ?? 0}
              sub="Requires immediate action"
              accent="red"
              trend={12}
            />
            <StatCard
              icon={Zap}
              label="Threats Blocked"
              value={(stats?.threats_blocked ?? 0).toLocaleString()}
              sub="Mitigated + resolved total"
              accent="green"
              trend={-5}
            />
            <StatCard
              icon={Clock}
              label="Avg Response"
              value={`${stats?.avg_response_time_minutes ?? '—'}m`}
              sub="Mean time to respond"
              accent="orange"
              trend={-8}
            />
            <StatCard
              icon={Server}
              label="Endpoints"
              value={stats?.endpoints_monitored ?? 0}
              sub="Currently monitored"
              accent="cyan"
            />
          </>
        )}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ThreatTrendChart data={trend} loading={statsLoading} />
        </div>
        <TopSourcesPanel sources={topSources} loading={statsLoading} />
      </div>

      {/* ── Alerts Table ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[#00d4ff]" />
            <h2 className="text-[#e2eaf5] font-semibold text-sm">Live Threat Alerts</h2>
            <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff10] border border-[#00d4ff30] px-2 py-0.5 rounded-full">
              {totalCount} ALERTS
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-[#00ff88]">LIVE FEED</span>
          </div>
        </div>

        {alertsError && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#ff336610] border border-[#ff336630] text-[#ff3366] text-xs">
            <AlertTriangle size={14} />
            <span>API error: {alertsError} — check that the backend is running.</span>
          </div>
        )}

        <AlertFilters
          searchQuery={searchQuery}
          riskFilter={riskFilter}
          statusFilter={statusFilter}
          onSearch={setSearchQuery}
          onRisk={setRiskFilter}
          onStatus={setStatusFilter}
        />

        <AlertsTable
          alerts={alerts}
          sortConfig={sortConfig}
          onSort={handleSort}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
          isLoading={alertsLoading}
        />
      </div>
    </div>
  )
}
