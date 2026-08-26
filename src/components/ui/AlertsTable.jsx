import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { RiskBadge, StatusBadge, formatTimestamp } from './badges'

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown size={12} className="text-[#4a6480]" />
  return sortConfig.dir === 'asc'
    ? <ChevronUp size={12} className="text-[#00d4ff]" />
    : <ChevronDown size={12} className="text-[#00d4ff]" />
}

const COLUMNS = [
  { key: 'id',         label: 'Alert ID',   sortable: true },
  { key: 'timestamp',  label: 'Timestamp',  sortable: true },
  { key: 'type',       label: 'Threat Type', sortable: false },
  { key: 'source',     label: 'Source IP',  sortable: true },
  { key: 'risk_level', label: 'Risk',       sortable: true },
  { key: 'status',     label: 'Status',     sortable: true },
  { key: 'actions',    label: '',           sortable: false },
]

function SkeletonRows({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {[120, 90, 180, 100, 72, 90, 32].map((w, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-3 bg-[#1a2d45] rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  ))
}

export default function AlertsTable({
  alerts,
  sortConfig,
  onSort,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  isLoading = false,
}) {
  const navigate = useNavigate()

  return (
    <div className="cyber-card overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a2d45]">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort(col.key)}
                  className={`px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-[#4a6480] whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:text-[#7a94b5] select-none' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortConfig={sortConfig} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2d4530]">
            {isLoading ? (
              <SkeletonRows />
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[#4a6480] font-mono text-sm">
                  No alerts match current filters
                </td>
              </tr>
            ) : (
              alerts.map((alert, idx) => (
                <tr
                  key={alert.id}
                  className={`group hover:bg-[#111d2e] transition-colors duration-150 animate-fade-in ${
                    alert.risk_level === 'CRITICAL' ? 'bg-[#ff336604]' : ''
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* ID */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[#00d4ff] text-xs font-semibold">{alert.id}</span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-[#7a94b5] text-xs">{formatTimestamp(alert.timestamp, true)}</span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="text-[#e2eaf5] text-xs truncate block" title={alert.type}>{alert.type}</span>
                    <span className="text-[#4a6480] text-[10px] font-mono">{alert.protocol} · {alert.destination}</span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[#e2eaf5] text-xs">{alert.source}</span>
                    <span className="block text-[#4a6480] text-[10px]">{alert.country_of_origin}</span>
                  </td>

                  {/* Risk */}
                  <td className="px-4 py-3">
                    <RiskBadge level={alert.risk_level} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={alert.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/alerts/${alert.id}`)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#00d4ff15] text-[#4a6480] hover:text-[#00d4ff]"
                      title="View details"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a2d45]">
        <span className="text-[#4a6480] text-xs font-mono">
          {totalCount} alert{totalCount !== 1 ? 's' : ''} · Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded hover:bg-[#111d2e] text-[#7a94b5] hover:text-[#e2eaf5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded text-xs font-mono transition-colors ${
                  page === currentPage
                    ? 'bg-[#00d4ff20] text-[#00d4ff] border border-[#00d4ff40]'
                    : 'text-[#4a6480] hover:text-[#e2eaf5] hover:bg-[#111d2e]'
                }`}
              >
                {page}
              </button>
            )
          })}
          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded hover:bg-[#111d2e] text-[#7a94b5] hover:text-[#e2eaf5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
