import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  User, Bell, Shield, Database, Key, Monitor,
  ToggleLeft, ToggleRight, Save, ChevronRight, AlertTriangle,
  Globe, Lock, Zap,
} from 'lucide-react'

function SettingSection({ icon: Icon, title, children }) {
  return (
    <div className="cyber-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1a2d45] bg-[#0d152050]">
        <div className="p-1.5 bg-[#00d4ff10] rounded-md border border-[#00d4ff20]">
          <Icon size={15} className="text-[#00d4ff]" />
        </div>
        <h3 className="text-[#e2eaf5] font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function ToggleSetting({ label, description, value, onChange, disabled = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-[#e2eaf5] text-sm">{label}</p>
        {description && <p className="text-[#4a6480] text-[11px] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className="shrink-0 transition-colors"
      >
        {value
          ? <ToggleRight size={28} className="text-[#00d4ff]" />
          : <ToggleLeft size={28} className="text-[#4a6480]" />
        }
      </button>
    </div>
  )
}

function SelectSetting({ label, options, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-[#e2eaf5] text-sm shrink-0">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="cyber-input text-xs font-mono cursor-pointer"
        style={{ maxWidth: '200px' }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0d1520' }}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [saved, setSaved] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    // Notifications
    emailAlerts:     true,
    slackWebhook:    false,
    criticalOnly:    false,
    digestMode:      false,
    // Security
    mfaEnabled:      user?.mfa_enabled ?? false,
    sessionTimeout:  '30',
    ipWhitelist:     false,
    auditLogging:    true,
    // Monitoring
    refreshInterval: '30',
    autoMitigate:    false,
    geoBlocking:     true,
    sandboxMode:     false,
    // Display
    compactMode:     false,
    showConfidence:  true,
    timezone:        'UTC',
    dateFormat:      'ISO',
  })

  function update(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function handleSave() {
    // In production: persist to API
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-3xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#e2eaf5] font-bold text-lg">Settings</h1>
          <p className="text-[#4a6480] text-xs font-mono mt-0.5">System configuration & user preferences</p>
        </div>
        <button
          onClick={handleSave}
          className={`cyber-btn flex items-center gap-2 ${saved ? 'border-[#00ff8860] text-[#00ff88] bg-[#00ff8810]' : ''}`}
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Profile */}
      <SettingSection icon={User} title="User Profile">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-[#0d1520] border border-[#1a2d45]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff20] to-[#00d4ff08] border border-[#00d4ff30] flex items-center justify-center text-[#00d4ff] text-lg font-bold font-mono">
            {user?.avatar || 'U'}
          </div>
          <div>
            <p className="text-[#e2eaf5] font-semibold">{user?.name || 'Operator'}</p>
            <p className="text-[#4a6480] text-xs font-mono">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#00d4ff10] border border-[#00d4ff30] text-[#00d4ff] rounded-full">
                {user?.role}
              </span>
              <span className="text-[10px] text-[#4a6480]">
                Last login: {user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">Display Name</label>
            <input defaultValue={user?.name} className="cyber-input text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">Email</label>
            <input defaultValue={user?.email} className="cyber-input text-sm" disabled />
          </div>
        </div>
      </SettingSection>

      {/* Notifications */}
      <SettingSection icon={Bell} title="Notifications">
        <ToggleSetting
          label="Email Alerts"
          description="Receive threat alerts via email"
          value={settings.emailAlerts}
          onChange={v => update('emailAlerts', v)}
        />
        <ToggleSetting
          label="Slack Webhook"
          description="Send alerts to a Slack channel"
          value={settings.slackWebhook}
          onChange={v => update('slackWebhook', v)}
        />
        <ToggleSetting
          label="Critical Alerts Only"
          description="Only notify for CRITICAL severity"
          value={settings.criticalOnly}
          onChange={v => update('criticalOnly', v)}
        />
        <ToggleSetting
          label="Daily Digest Mode"
          description="Batch alerts into a single daily report"
          value={settings.digestMode}
          onChange={v => update('digestMode', v)}
        />
      </SettingSection>

      {/* Security */}
      <SettingSection icon={Lock} title="Security">
        <ToggleSetting
          label="Multi-Factor Authentication"
          description="Require MFA on every login"
          value={settings.mfaEnabled}
          onChange={v => update('mfaEnabled', v)}
        />
        <SelectSetting
          label="Session Timeout"
          value={settings.sessionTimeout}
          onChange={v => update('sessionTimeout', v)}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '480', label: '8 hours' },
          ]}
        />
        <ToggleSetting
          label="IP Whitelist"
          description="Restrict access to approved IPs only"
          value={settings.ipWhitelist}
          onChange={v => update('ipWhitelist', v)}
        />
        <ToggleSetting
          label="Audit Logging"
          description="Log all user actions (required for compliance)"
          value={settings.auditLogging}
          onChange={v => update('auditLogging', v)}
          disabled
        />
        <div className="pt-2 border-t border-[#1a2d45]">
          <button className="cyber-btn cyber-btn-danger text-sm flex items-center gap-2 w-full sm:w-auto">
            <Key size={14} />
            Rotate API Keys
          </button>
        </div>
      </SettingSection>

      {/* Monitoring */}
      <SettingSection icon={Monitor} title="Monitoring Engine">
        <SelectSetting
          label="Data Refresh Interval"
          value={settings.refreshInterval}
          onChange={v => update('refreshInterval', v)}
          options={[
            { value: '10',  label: '10 seconds' },
            { value: '30',  label: '30 seconds' },
            { value: '60',  label: '1 minute' },
            { value: '300', label: '5 minutes' },
          ]}
        />
        <ToggleSetting
          label="Auto-Mitigate Low Risk"
          description="Automatically resolve LOW/INFO alerts"
          value={settings.autoMitigate}
          onChange={v => update('autoMitigate', v)}
        />
        <ToggleSetting
          label="Geo-Blocking"
          description="Block traffic from sanctioned regions"
          value={settings.geoBlocking}
          onChange={v => update('geoBlocking', v)}
        />
        <ToggleSetting
          label="Sandbox Mode"
          description="Isolate suspicious processes automatically"
          value={settings.sandboxMode}
          onChange={v => update('sandboxMode', v)}
        />
      </SettingSection>

      {/* Display */}
      <SettingSection icon={Globe} title="Display Preferences">
        <ToggleSetting
          label="Compact Table View"
          description="Show more rows with reduced padding"
          value={settings.compactMode}
          onChange={v => update('compactMode', v)}
        />
        <ToggleSetting
          label="Show Confidence Score"
          description="Display ML confidence on each alert"
          value={settings.showConfidence}
          onChange={v => update('showConfidence', v)}
        />
        <SelectSetting
          label="Timezone"
          value={settings.timezone}
          onChange={v => update('timezone', v)}
          options={[
            { value: 'UTC',     label: 'UTC' },
            { value: 'EST',     label: 'Eastern (EST)' },
            { value: 'PST',     label: 'Pacific (PST)' },
            { value: 'IST',     label: 'India (IST)' },
            { value: 'CET',     label: 'Central Europe (CET)' },
          ]}
        />
        <SelectSetting
          label="Date Format"
          value={settings.dateFormat}
          onChange={v => update('dateFormat', v)}
          options={[
            { value: 'ISO',  label: 'ISO 8601 (2024-01-15)' },
            { value: 'US',   label: 'US (01/15/2024)' },
            { value: 'EU',   label: 'EU (15/01/2024)' },
          ]}
        />
      </SettingSection>

      {/* Danger Zone */}
      <div className="cyber-card border-[#ff336630] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ff336630] bg-[#ff336608]">
          <AlertTriangle size={15} className="text-[#ff3366]" />
          <h3 className="text-[#ff3366] font-semibold text-sm">Danger Zone</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[#e2eaf5] text-sm">Reset All Settings</p>
              <p className="text-[#4a6480] text-[11px] mt-0.5">Restore factory defaults. Cannot be undone.</p>
            </div>
            <button className="cyber-btn cyber-btn-danger text-xs px-3 py-1.5">Reset</button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[#e2eaf5] text-sm">Sign Out All Sessions</p>
              <p className="text-[#4a6480] text-[11px] mt-0.5">Terminate all active sessions immediately.</p>
            </div>
            <button onClick={logout} className="cyber-btn cyber-btn-danger text-xs px-3 py-1.5">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
