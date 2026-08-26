import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldAlert,
  Settings,
  Activity,
  Shield,
  Cpu,
  Bot,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mcp-agent',  label: 'MCP Agent', icon: Bot },
  { to: '/settings',  label: 'Settings',  icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 flex flex-col bg-[#0d1520] border-r border-[#1a2d45] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1a2d45]">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0099bb] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)]">
            <Shield size={20} className="text-[#080c14]" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff88] rounded-full border-2 border-[#0d1520]" />
        </div>
        <div>
          <h1 className="text-[#e2eaf5] font-bold text-lg leading-none tracking-wide">SYBRAI</h1>
          <p className="text-[#4a6480] text-[10px] font-mono uppercase tracking-widest mt-0.5">Cyber Defense</p>
        </div>
      </div>

      {/* System Status */}
      <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg bg-[#111d2e] border border-[#1a2d45]">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={13} className="text-[#00ff88]" />
          <span className="text-[11px] font-mono text-[#00ff88] uppercase tracking-widest">System Active</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'IDS Engine', status: 'Online' },
            { label: 'Threat Intel', status: 'Synced' },
            { label: 'Log Collector', status: 'Online' },
          ].map(({ label, status }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[10px] text-[#7a94b5]">{label}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#00ff88]">
                <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-6 space-y-1">
        <p className="text-[10px] font-mono text-[#4a6480] uppercase tracking-widest px-3 mb-2">Navigation</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30] shadow-[0_0_12px_rgba(0,212,255,0.1)]'
                  : 'text-[#7a94b5] hover:text-[#e2eaf5] hover:bg-[#111d2e]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-[#00d4ff]' : 'text-[#4a6480] group-hover:text-[#7a94b5]'} />
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 bg-[#00d4ff] rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Threat Level Indicator */}
      <div className="mx-4 mb-4 px-3 py-3 rounded-lg bg-[#ff336610] border border-[#ff336630]">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldAlert size={14} className="text-[#ff3366]" />
          <span className="text-[10px] font-mono text-[#ff3366] uppercase tracking-widest">Threat Level</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#1a2d45] rounded-full overflow-hidden">
            <div className="h-full w-[72%] bg-gradient-to-r from-[#ff8c42] to-[#ff3366] rounded-full" />
          </div>
          <span className="text-[11px] font-bold text-[#ff3366]">HIGH</span>
        </div>
      </div>

      {/* User / Admin Profile Card */}
      <div className="px-4 pb-4 border-t border-[#1a2d45] pt-3 bg-[#0a111a]/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d4ff30] to-[#00d4ff10] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff] text-xs font-bold font-mono shadow-[0_0_10px_rgba(0,212,255,0.2)]">
            {user?.avatar || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[#e2eaf5] text-xs font-semibold truncate">{user?.name || 'Administrator'}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30]">
                {user?.role || 'ADMIN'}
              </span>
              <span className="text-[#4a6480] text-[10px] font-mono truncate">{user?.email || 'admin@sybrai.io'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out session"
            className="text-[#4a6480] hover:text-[#ff3366] hover:bg-[#ff336615] transition-colors p-1.5 rounded-lg"
          >
            <Cpu size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
