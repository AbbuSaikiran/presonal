import { Globe, AlertTriangle } from 'lucide-react'

const RISK_COLOR = {
  CRITICAL: '#ff3366',
  HIGH:     '#ff8c42',
  MEDIUM:   '#ffd700',
  LOW:      '#00d4ff',
}

function SourceSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <div className="h-3 w-32 bg-[#1a2d45] rounded" />
            <div className="h-3 w-14 bg-[#1a2d45] rounded" />
          </div>
          <div className="h-1 bg-[#1a2d45] rounded-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * TopSourcesPanel — ranked list of top threat-origin IPs with bar sparklines.
 * @param {Array}   sources — array of { ip, country, count, risk }
 * @param {boolean} loading — show skeleton while fetching
 */
export default function TopSourcesPanel({ sources = [], loading = false }) {
  const max = sources.length ? Math.max(...sources.map(s => s.count)) : 1

  return (
    <div className="cyber-card-glow p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={15} className="text-[#00d4ff]" />
        <h3 className="text-[#e2eaf5] font-semibold text-sm">Top Threat Sources</h3>
      </div>

      {loading ? (
        <SourceSkeleton />
      ) : sources.length === 0 ? (
        <p className="text-[#4a6480] text-xs font-mono text-center py-8">No data yet</p>
      ) : (
        <div className="space-y-3">
          {sources.map((src, i) => {
            const color = RISK_COLOR[src.risk] || '#7a94b5'
            const pct = Math.round((src.count / max) * 100)
            return (
              <div key={src.ip}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#4a6480] font-mono text-[10px] w-3">{i + 1}.</span>
                    <span className="font-mono text-xs text-[#e2eaf5]">{src.ip}</span>
                    <span className="text-[10px] text-[#4a6480]">{src.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color }}>{src.count} hits</span>
                    {src.risk === 'CRITICAL' && (
                      <AlertTriangle size={11} style={{ color }} className="animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="h-1 bg-[#1a2d45] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
