import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="cyber-card px-3 py-2 text-xs font-mono">
      <p className="text-[#7a94b5] mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span className="uppercase">{p.name}</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// Skeleton bars shown while loading
function ChartSkeleton() {
  return (
    <div className="flex items-end justify-around h-[200px] gap-1 px-4 pb-4 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[#1a2d45]"
          style={{ height: `${20 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  )
}

/**
 * ThreatTrendChart — area chart of threat severity over the past 24 hours.
 * @param {Array}   data    — array of { time, critical, high, medium, low }
 * @param {boolean} loading — show skeleton while parent is fetching
 */
export default function ThreatTrendChart({ data = [], loading = false }) {
  return (
    <div className="cyber-card-glow p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[#e2eaf5] font-semibold text-sm">Threat Activity</h3>
          <p className="text-[#4a6480] text-[11px] mt-0.5 font-mono">24-hour threat distribution by severity</p>
        </div>
        <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff10] border border-[#00d4ff30] px-2 py-0.5 rounded-md">
          LIVE
        </span>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff3366" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff3366" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff8c42" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff8c42" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ffd700" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ffd700" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2d4550" />
            <XAxis dataKey="time" tick={{ fill: '#4a6480', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4a6480', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v) => <span style={{ color: '#7a94b5', fontSize: '10px', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>{v}</span>}
            />
            <Area type="monotone" dataKey="critical" stroke="#ff3366" strokeWidth={1.5} fill="url(#gCritical)" />
            <Area type="monotone" dataKey="high"     stroke="#ff8c42" strokeWidth={1.5} fill="url(#gHigh)" />
            <Area type="monotone" dataKey="medium"   stroke="#ffd700" strokeWidth={1.5} fill="url(#gMedium)" />
            <Area type="monotone" dataKey="low"      stroke="#00d4ff" strokeWidth={1.5} fill="url(#gLow)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
