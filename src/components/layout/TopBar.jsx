import React, { useState, useRef, useEffect } from 'react'
import { Bell, Wifi, WifiOff, RefreshCw, Loader2, Shield, LogOut, Settings as SettingsIcon, User, ChevronDown } from 'lucide-react'
import { useLiveFeed } from '../../hooks/useLiveFeed'
import { useAuth } from '../../hooks/useAuth'
import { useLocation, Link } from 'react-router-dom'

const PAGE_TITLES = {
  '/dashboard': { title: 'Threat Dashboard', sub: 'Real-time security monitoring' },
  '/mcp-agent':  { title: 'MCP Agent & Local LLM', sub: 'Autonomous AI tool orchestration & reasoning' },
  '/settings':   { title: 'Settings', sub: 'Configuration & preferences' },
}

function getTitle(pathname) {
  if (pathname.startsWith('/alerts/')) return { title: 'Alert Detail', sub: 'Incident analysis & response' }
  return PAGE_TITLES[pathname] || { title: 'Sybrai Cyber Defense', sub: '' }
}

export default function TopBar() {
  const { currentTime, newAlertCount, wsStatus, clearNewAlerts } = useLiveFeed()
  const { user, logout } = useAuth()
  const location = useLocation()
  const { title, sub } = getTitle(location.pathname)

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: false })
  const dateStr = currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ADMINISTRATOR'

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#1a2d45] bg-[#0d1520] shrink-0 z-20">
      {/* Page title */}
      <div>
        <h2 className="text-[#e2eaf5] font-semibold text-sm leading-none flex items-center gap-2">
          {title}
        </h2>
        {sub && <p className="text-[#4a6480] text-[10px] mt-0.5 font-mono">{sub}</p>}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Live clock */}
        <div className="text-right hidden md:block">
          <p className="text-[#00d4ff] font-mono text-xs font-medium leading-none">{timeStr}</p>
          <p className="text-[#4a6480] font-mono text-[9px] mt-0.5">{dateStr}</p>
        </div>

        {/* Connection status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-colors ${
            wsStatus === 'connected'
              ? 'bg-[#00ff8810] border-[#00ff8830] text-[#00ff88]'
              : wsStatus === 'connecting'
              ? 'bg-[#ffd70010] border-[#ffd70030] text-[#ffd700]'
              : 'bg-[#ff336610] border-[#ff336630] text-[#ff3366]'
          }`}
        >
          {wsStatus === 'connected' && <Wifi size={11} />}
          {wsStatus === 'connecting' && <Loader2 size={11} className="animate-spin" />}
          {wsStatus === 'disconnected' && <WifiOff size={11} />}
          <span>{wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
          {wsStatus === 'connected' && <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />}
        </div>

        {/* Notifications */}
        <button
          onClick={clearNewAlerts}
          className="relative p-2 rounded-lg hover:bg-[#111d2e] transition-colors text-[#7a94b5] hover:text-[#e2eaf5]"
          title="Alert Notifications"
        >
          <Bell size={16} />
          {newAlertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff3366] rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
              {newAlertCount > 9 ? '9+' : newAlertCount}
            </span>
          )}
        </button>

        {/* User Profile & Admin Badge Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-[#111d2e] border border-transparent hover:border-[#1a2d45] transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff30] to-[#0099bb10] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff] text-xs font-bold font-mono shadow-[0_0_10px_rgba(0,212,255,0.2)]">
              {user?.avatar || 'AD'}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#e2eaf5] leading-none group-hover:text-[#00d4ff] transition-colors">
                  {user?.name || 'Sarah Connor (Admin)'}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isAdmin
                      ? 'bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30]'
                      : 'bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]'
                  }`}
                >
                  {user?.role || 'ADMIN'}
                </span>
              </div>
              <p className="text-[10px] text-[#4a6480] font-mono mt-0.5 truncate">
                {user?.email || 'admin@sybrai.io'}
              </p>
            </div>
            <ChevronDown size={13} className="text-[#4a6480] group-hover:text-[#7a94b5] transition-transform duration-200" />
          </button>

          {/* Profile Popover Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0d1520] border border-[#1a2d45] shadow-2xl p-3 space-y-3 z-50 animate-fade-in">
              <div className="pb-2.5 border-b border-[#1a2d45]">
                <p className="text-xs font-bold text-[#e2eaf5]">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-[#7a94b5] truncate mt-0.5">{user?.email || 'admin@sybrai.io'}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#00ff88]">
                    {user?.department || 'Cyber Defense Command'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#7a94b5] hover:text-[#00d4ff] hover:bg-[#111d2e] transition-colors"
                >
                  <SettingsIcon size={14} />
                  <span>Security & System Settings</span>
                </Link>
                <Link
                  to="/mcp-agent"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#7a94b5] hover:text-[#00d4ff] hover:bg-[#111d2e] transition-colors"
                >
                  <Shield size={14} />
                  <span>MCP Agent Hub</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-[#1a2d45]">
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#ff3366] hover:bg-[#ff336615] transition-colors font-mono"
                >
                  <LogOut size={14} />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
