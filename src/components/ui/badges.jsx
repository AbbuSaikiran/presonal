/**
 * Shared utility helpers for risk/status display.
 */

export const RISK_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    bg: 'bg-[#ff336615]',
    border: 'border-[#ff336650]',
    text: 'text-[#ff3366]',
    dot: 'bg-[#ff3366]',
    glow: 'shadow-[0_0_8px_rgba(255,51,102,0.5)]',
    barColor: '#ff3366',
  },
  HIGH: {
    label: 'HIGH',
    bg: 'bg-[#ff8c4215]',
    border: 'border-[#ff8c4250]',
    text: 'text-[#ff8c42]',
    dot: 'bg-[#ff8c42]',
    glow: 'shadow-[0_0_8px_rgba(255,140,66,0.4)]',
    barColor: '#ff8c42',
  },
  MEDIUM: {
    label: 'MEDIUM',
    bg: 'bg-[#ffd70015]',
    border: 'border-[#ffd70050]',
    text: 'text-[#ffd700]',
    dot: 'bg-[#ffd700]',
    glow: 'shadow-[0_0_8px_rgba(255,215,0,0.35)]',
    barColor: '#ffd700',
  },
  LOW: {
    label: 'LOW',
    bg: 'bg-[#00d4ff15]',
    border: 'border-[#00d4ff50]',
    text: 'text-[#00d4ff]',
    dot: 'bg-[#00d4ff]',
    glow: 'shadow-[0_0_8px_rgba(0,212,255,0.3)]',
    barColor: '#00d4ff',
  },
  INFO: {
    label: 'INFO',
    bg: 'bg-[#7a94b515]',
    border: 'border-[#7a94b540]',
    text: 'text-[#7a94b5]',
    dot: 'bg-[#7a94b5]',
    glow: '',
    barColor: '#7a94b5',
  },
}

export const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    bg: 'bg-[#ff336612]',
    border: 'border-[#ff336640]',
    text: 'text-[#ff3366]',
    dot: 'bg-[#ff3366]',
    pulse: true,
  },
  INVESTIGATING: {
    label: 'Investigating',
    bg: 'bg-[#ffd70012]',
    border: 'border-[#ffd70040]',
    text: 'text-[#ffd700]',
    dot: 'bg-[#ffd700]',
    pulse: true,
  },
  MITIGATED: {
    label: 'Mitigated',
    bg: 'bg-[#00d4ff12]',
    border: 'border-[#00d4ff40]',
    text: 'text-[#00d4ff]',
    dot: 'bg-[#00d4ff]',
    pulse: false,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-[#00ff8812]',
    border: 'border-[#00ff8840]',
    text: 'text-[#00ff88]',
    dot: 'bg-[#00ff88]',
    pulse: false,
  },
  FALSE_POSITIVE: {
    label: 'False Positive',
    bg: 'bg-[#7a94b512]',
    border: 'border-[#7a94b540]',
    text: 'text-[#7a94b5]',
    dot: 'bg-[#7a94b5]',
    pulse: false,
  },
}

export function RiskBadge({ level, size = 'sm' }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.INFO
  const padding = size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase tracking-widest rounded-md border ${cfg.bg} ${cfg.border} ${cfg.text} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${level === 'CRITICAL' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

export function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN
  const padding = size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${cfg.bg} ${cfg.border} ${cfg.text} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

export function formatTimestamp(iso, short = false) {
  const d = new Date(iso)
  if (short) {
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}
