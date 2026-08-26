export default function StatCard({ icon: Icon, label, value, sub, accent = 'cyan', trend }) {
  const accentMap = {
    cyan:   { text: 'text-[#00d4ff]', glow: 'shadow-[0_0_20px_rgba(0,212,255,0.08)]', border: 'border-[#00d4ff20]', bg: 'bg-[#00d4ff10]' },
    red:    { text: 'text-[#ff3366]', glow: 'shadow-[0_0_20px_rgba(255,51,102,0.08)]', border: 'border-[#ff336620]', bg: 'bg-[#ff336610]' },
    green:  { text: 'text-[#00ff88]', glow: 'shadow-[0_0_20px_rgba(0,255,136,0.08)]', border: 'border-[#00ff8820]', bg: 'bg-[#00ff8810]' },
    orange: { text: 'text-[#ff8c42]', glow: 'shadow-[0_0_20px_rgba(255,140,66,0.08)]', border: 'border-[#ff8c4220]', bg: 'bg-[#ff8c4210]' },
    yellow: { text: 'text-[#ffd700]', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.08)]',  border: 'border-[#ffd70020]', bg: 'bg-[#ffd70010]' },
  }
  const a = accentMap[accent] || accentMap.cyan

  return (
    <div className={`cyber-card-glow p-5 flex flex-col gap-3 hover:border-[#1a2d4580] transition-all duration-300 ${a.glow}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${a.bg} border ${a.border}`}>
          <Icon size={18} className={a.text} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${trend >= 0 ? 'text-[#ff3366] bg-[#ff336610] border-[#ff336630]' : 'text-[#00ff88] bg-[#00ff8810] border-[#00ff8830]'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold font-mono ${a.text} leading-none`}>{value}</p>
        <p className="text-[#e2eaf5] text-sm font-medium mt-1">{label}</p>
        {sub && <p className="text-[#4a6480] text-[11px] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
