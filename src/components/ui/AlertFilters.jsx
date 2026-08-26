import { Search, Filter, X } from 'lucide-react'

const RISK_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const STATUS_OPTIONS = ['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'FALSE_POSITIVE']

const RISK_COLORS = {
  ALL:      'text-[#7a94b5] border-[#1a2d45] bg-transparent',
  CRITICAL: 'text-[#ff3366] border-[#ff336640] bg-[#ff336610]',
  HIGH:     'text-[#ff8c42] border-[#ff8c4240] bg-[#ff8c4210]',
  MEDIUM:   'text-[#ffd700] border-[#ffd70040] bg-[#ffd70010]',
  LOW:      'text-[#00d4ff] border-[#00d4ff40] bg-[#00d4ff10]',
  INFO:     'text-[#7a94b5] border-[#7a94b540] bg-[#7a94b510]',
}

export default function AlertFilters({ searchQuery, riskFilter, statusFilter, onSearch, onRisk, onStatus }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6480]" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by IP, ID, type..."
          className="cyber-input pl-9 pr-8"
          id="alert-search"
        />
        {searchQuery && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a6480] hover:text-[#e2eaf5]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Risk filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={13} className="text-[#4a6480]" />
        {RISK_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => onRisk(opt)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest border transition-all duration-150 ${
              riskFilter === opt
                ? (RISK_COLORS[opt] || RISK_COLORS.ALL)
                : 'text-[#4a6480] border-transparent hover:border-[#1a2d45] hover:text-[#7a94b5]'
            }`}
          >
            {opt === 'ALL' ? 'All Risk' : opt}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div>
        <select
          value={statusFilter}
          onChange={e => onStatus(e.target.value)}
          className="cyber-input text-xs font-mono cursor-pointer appearance-none"
          id="status-filter"
          style={{ minWidth: '140px' }}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt} style={{ background: '#0d1520' }}>
              {opt === 'ALL' ? 'All Statuses' : opt.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
