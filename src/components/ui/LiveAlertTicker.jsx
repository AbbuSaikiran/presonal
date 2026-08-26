import { useEffect, useRef, useState } from 'react'
import { Radio, AlertTriangle } from 'lucide-react'
import { mockAlerts } from '../../data/mockData'

const RISK_COLOR = {
  CRITICAL: '#ff3366',
  HIGH: '#ff8c42',
  MEDIUM: '#ffd700',
  LOW: '#00d4ff',
  INFO: '#7a94b5',
}

const tickerItems = mockAlerts.slice(0, 12).map(a => ({
  id: a.id,
  type: a.type,
  source: a.source,
  risk: a.risk_level,
}))

export default function LiveAlertTicker() {
  const trackRef = useRef(null)
  const [paused, setPaused] = useState(false)

  // duplicate for seamless loop
  const doubled = [...tickerItems, ...tickerItems]

  return (
    <div
      className="relative flex items-center h-8 overflow-hidden border-y border-[#1a2d45] bg-[#0a1018]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="marquee"
      aria-label="Live alert ticker"
    >
      {/* Left label */}
      <div className="shrink-0 flex items-center gap-2 px-3 bg-[#ff336618] border-r border-[#ff336640] h-full z-10">
        <Radio size={11} className="text-[#ff3366] animate-pulse" />
        <span className="text-[#ff3366] text-[9px] font-mono uppercase tracking-widest font-bold whitespace-nowrap">
          Live Feed
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a1018] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a1018] to-transparent z-10 pointer-events-none" />

        <div
          ref={trackRef}
          className="flex items-center gap-0 whitespace-nowrap"
          style={{
            animation: paused
              ? 'none'
              : 'ticker 60s linear infinite',
          }}
        >
          {doubled.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-4 text-[11px] font-mono shrink-0"
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: RISK_COLOR[item.risk] }}
              />
              <span style={{ color: RISK_COLOR[item.risk] }} className="font-semibold uppercase tracking-widest text-[9px]">
                {item.risk}
              </span>
              <span className="text-[#7a94b5]">{item.id}</span>
              <span className="text-[#e2eaf5]">{item.type}</span>
              <span className="text-[#4a6480]">from {item.source}</span>
              <span className="text-[#1a2d45] px-2">·</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
