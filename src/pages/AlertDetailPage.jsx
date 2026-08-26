import { useParams, useNavigate } from 'react-router-dom'
import { useAlerts } from '../hooks/useAlerts'
import { RiskBadge, StatusBadge, formatTimestamp, formatBytes, STATUS_CONFIG } from '../components/ui/badges'
import { explainAlert } from '../lib/api'
import {
  ArrowLeft, Globe, Server, Network, Shield, Clock,
  Hash, User, Tag, Activity, CheckCircle2, AlertTriangle,
  ChevronRight, Copy, Check, Loader2, Sparkles, Brain, ListChecks,
} from 'lucide-react'
import { useState, useEffect } from 'react'

function InfoRow({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#1a2d4530] last:border-0">
      <span className="text-[#4a6480] text-xs shrink-0 w-36">{label}</span>
      <span className={`text-right text-xs ${mono ? 'font-mono text-[#e2eaf5]' : 'text-[#e2eaf5]'}`}>
        {children ?? value ?? '—'}
      </span>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={handleCopy} className="p-1 rounded text-[#4a6480] hover:text-[#00d4ff] transition-colors">
      {copied ? <Check size={12} className="text-[#00ff88]" /> : <Copy size={12} />}
    </button>
  )
}

const STATUS_TRANSITIONS = {
  OPEN:          ['INVESTIGATING', 'FALSE_POSITIVE'],
  INVESTIGATING: ['MITIGATED', 'FALSE_POSITIVE'],
  MITIGATED:     ['RESOLVED'],
  RESOLVED:      [],
  FALSE_POSITIVE:[],
}

export default function AlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAlertById, updateAlertStatus } = useAlerts()

  const [alert,       setAlert]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [updating,    setUpdating]    = useState(null)  // status being applied
  const [updateErr,   setUpdateErr]   = useState(null)

  // AI Explanation State
  const [aiExplanation, setAiExplanation] = useState(null)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiError,       setAiError]       = useState(null)

  // Fetch on mount (getAlertById checks cache → API)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAlertById(id).then(a => {
      if (cancelled) return
      if (!a) setNotFound(true)
      else setAlert(a)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  // Keep local state in sync with WS status_updated events
  useEffect(() => {
    function handleUpdate(e) {
      if (e.detail.id === id) {
        setAlert(prev => prev ? { ...prev, status: e.detail.status } : prev)
      }
    }
    window.addEventListener('sybrai:status_updated', handleUpdate)
    return () => window.removeEventListener('sybrai:status_updated', handleUpdate)
  }, [id])

  async function handleStatusChange(newStatus) {
    setUpdating(newStatus)
    setUpdateErr(null)
    try {
      await updateAlertStatus(id, newStatus)
      setAlert(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      setUpdateErr(err.message)
    } finally {
      setUpdating(null)
    }
  }

  async function handleGenerateExplanation() {
    if (!alert) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await explainAlert(alert.id, alert)
      setAiExplanation(result)
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI incident explanation.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 size={32} className="text-[#00d4ff] animate-spin" />
        <p className="text-[#4a6480] font-mono text-sm">Loading alert {id} …</p>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !alert) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle size={40} className="text-[#ff3366]" />
        <h2 className="text-[#e2eaf5] font-semibold">Alert not found</h2>
        <p className="text-[#4a6480] text-sm">Alert ID <span className="font-mono text-[#00d4ff]">{id}</span> does not exist.</p>
        <button onClick={() => navigate('/dashboard')} className="cyber-btn mt-2">
          <ArrowLeft size={14} className="inline mr-1" /> Back to Dashboard
        </button>
      </div>
    )
  }

  const transitions = STATUS_TRANSITIONS[alert.status] || []

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#4a6480] font-mono">
        <button onClick={() => navigate('/dashboard')} className="hover:text-[#00d4ff] transition-colors">
          Dashboard
        </button>
        <ChevronRight size={12} />
        <button onClick={() => navigate('/dashboard')} className="hover:text-[#00d4ff] transition-colors">
          Alerts
        </button>
        <ChevronRight size={12} />
        <span className="text-[#00d4ff]">{alert.id}</span>
      </div>

      {/* Header */}
      <div className="cyber-card-glow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-[#1a2d45] text-[#7a94b5] hover:text-[#e2eaf5] transition-colors mt-0.5 shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="font-mono text-[#00d4ff] font-bold text-lg">{alert.id}</span>
                <RiskBadge level={alert.risk_level} size="lg" />
                <StatusBadge status={alert.status} size="lg" />
              </div>
              <h1 className="text-[#e2eaf5] font-semibold text-xl mb-1">{alert.type}</h1>
              <p className="text-[#7a94b5] text-sm font-mono">{formatTimestamp(alert.timestamp)}</p>
            </div>
          </div>

          {/* Action Buttons: Status updates & AI Explainer */}
          <div className="flex flex-col gap-2 shrink-0 items-start sm:items-end">
            <button
              onClick={handleGenerateExplanation}
              disabled={aiLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#00d4ff15] border border-[#00d4ff40] text-[#00d4ff] hover:bg-[#00d4ff25] transition-all disabled:opacity-50 shadow-[0_0_12px_#00d4ff20]"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
              <span>{aiExplanation ? 'Refresh AI Analysis' : 'Explain with Claude'}</span>
            </button>

            {transitions.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 sm:items-end">
                <p className="text-[10px] font-mono text-[#4a6480] uppercase tracking-widest">Update Status</p>
                {updateErr && (
                  <p className="text-[#ff3366] text-[10px] font-mono">{updateErr}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {transitions.map(next => {
                    const cfg = STATUS_CONFIG[next]
                    return (
                      <button
                        key={next}
                        onClick={() => handleStatusChange(next)}
                        disabled={!!updating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                      >
                        {updating === next && <Loader2 size={10} className="animate-spin" />}
                        → {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {alert.description && (
          <div className="mt-4 ml-14 p-4 rounded-lg bg-[#0d1520] border border-[#1a2d45] text-[#7a94b5] text-sm leading-relaxed">
            {alert.description}
          </div>
        )}
      </div>

      {/* ── AI Incident Explanation Panel (Claude Integration) ─────────── */}
      {(aiExplanation || aiLoading || aiError) && (
        <div className="cyber-card-glow p-6 border-l-4 border-l-[#00d4ff] bg-[#00d4ff05] animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#00d4ff20] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff]">
                <Brain size={16} />
              </div>
              <div>
                <h3 className="text-[#e2eaf5] font-semibold text-sm flex items-center gap-2">
                  <span>AI Incident Intelligence Briefing</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30]">
                    {aiExplanation?.model_used ?? 'Claude Analysis'}
                  </span>
                </h3>
                <p className="text-[#4a6480] text-[11px] font-mono">Automated Tier-3 Threat Analysis & Action Plan</p>
              </div>
            </div>
            {aiExplanation?.suggested_status && (
              <span className="text-xs font-mono text-[#ffd700] bg-[#ffd70010] border border-[#ffd70030] px-2.5 py-1 rounded-md">
                Suggested SOC Status: {aiExplanation.suggested_status}
              </span>
            )}
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-3 py-6 text-[#7a94b5] text-sm">
              <Loader2 size={18} className="text-[#00d4ff] animate-spin" />
              <span>Querying Claude AI threat intelligence model …</span>
            </div>
          ) : aiError ? (
            <div className="p-3 rounded-lg bg-[#ff336610] border border-[#ff336630] text-[#ff3366] text-xs font-mono">
              {aiError}
            </div>
          ) : aiExplanation && (
            <div className="space-y-4 text-sm">
              {/* Summary */}
              <div className="p-4 rounded-lg bg-[#0d1520] border border-[#1a2d45]">
                <p className="text-[11px] font-mono text-[#00d4ff] uppercase tracking-wider mb-1.5">Executive Summary</p>
                <p className="text-[#e2eaf5] leading-relaxed">{aiExplanation.incident_summary}</p>
              </div>

              {/* Threat Assessment */}
              <div className="p-4 rounded-lg bg-[#0d1520] border border-[#1a2d45]">
                <p className="text-[11px] font-mono text-[#ff8c42] uppercase tracking-wider mb-1.5">Threat & Risk Assessment</p>
                <p className="text-[#7a94b5] leading-relaxed">{aiExplanation.threat_assessment}</p>
              </div>

              {/* Recommended Actions */}
              {aiExplanation.recommended_actions?.length > 0 && (
                <div className="p-4 rounded-lg bg-[#0d1520] border border-[#1a2d45]">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks size={14} className="text-[#00ff88]" />
                    <p className="text-[11px] font-mono text-[#00ff88] uppercase tracking-wider">Recommended Remediation Playbook</p>
                  </div>
                  <ul className="space-y-2">
                    {aiExplanation.recommended_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[#e2eaf5]">
                        <span className="font-mono text-[#00d4ff] font-bold shrink-0">{idx + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Network */}
        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Network size={15} className="text-[#00d4ff]" />
            <h3 className="text-[#e2eaf5] font-semibold text-sm">Network Details</h3>
          </div>
          <InfoRow label="Source IP" mono>
            <span className="flex items-center gap-1">{alert.source} <CopyButton text={alert.source} /></span>
          </InfoRow>
          <InfoRow label="Source Port"     value={alert.source_port}      mono />
          <InfoRow label="Destination"     value={alert.destination}      mono />
          <InfoRow label="Dest. Port"      value={alert.destination_port} mono />
          <InfoRow label="Protocol"        value={alert.protocol}         mono />
          <InfoRow label="Country"         value={alert.country_of_origin} />
        </div>

        {/* Threat */}
        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-[#ff3366]" />
            <h3 className="text-[#e2eaf5] font-semibold text-sm">Threat Intelligence</h3>
          </div>
          <InfoRow label="MITRE Tactic"   value={alert.mitre_tactic} />
          <InfoRow label="Confidence"     mono>
            <span className={`${alert.confidence_score >= 85 ? 'text-[#ff3366]' : alert.confidence_score >= 70 ? 'text-[#ffd700]' : 'text-[#00d4ff]'}`}>
              {alert.confidence_score}%
            </span>
          </InfoRow>
          <InfoRow label="FP Rate"        value={(alert.false_positive_rate * 100).toFixed(1) + '%'} mono />
          <InfoRow label="CVE ID"         mono>
            {alert.cve_id
              ? <a href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${alert.cve_id}`} target="_blank" rel="noreferrer" className="text-[#00d4ff] hover:underline">{alert.cve_id}</a>
              : <span className="text-[#4a6480]">None identified</span>
            }
          </InfoRow>
          <InfoRow label="Assigned To"   value={alert.assigned_to || 'Unassigned'} />
          <InfoRow label="User Affected" value={alert.user_affected || 'None'} mono />
        </div>

        {/* Traffic */}
        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-[#ffd700]" />
            <h3 className="text-[#e2eaf5] font-semibold text-sm">Traffic Analysis</h3>
          </div>
          <InfoRow label="Attempt Count"    value={alert.attempt_count.toLocaleString()} mono />
          <InfoRow label="Packets"          value={alert.packets_transferred.toLocaleString()} mono />
          <InfoRow label="Data Transferred" value={formatBytes(alert.bytes_transferred)}    mono />
          <InfoRow label="Tags" mono>
            <span className="flex flex-wrap gap-1 justify-end">
              {(alert.tags || []).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-[#1a2d45] text-[#7a94b5] rounded text-[10px] font-mono">{t}</span>
              ))}
            </span>
          </InfoRow>
        </div>
      </div>

      {/* Timeline */}
      <div className="cyber-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={15} className="text-[#00d4ff]" />
          <h3 className="text-[#e2eaf5] font-semibold text-sm">Incident Timeline</h3>
        </div>
        <div className="relative space-y-0">
          {(alert.timeline || []).map((event, i) => (
            <div key={i} className="flex gap-4 relative">
              {i < alert.timeline.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-[#1a2d45]" />
              )}
              <div className="relative z-10 w-6 h-6 rounded-full bg-[#0d1520] border-2 border-[#00d4ff40] flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full" />
              </div>
              <div className="pb-5">
                <p className="text-[#e2eaf5] text-sm font-medium">{event.event}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[#4a6480] font-mono text-[10px]">{formatTimestamp(event.time)}</span>
                  <span className="text-[#4a6480] text-[10px]">· {event.actor}</span>
                </div>
              </div>
            </div>
          ))}
          {/* Final state */}
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-[#00ff8815] border-2 border-[#00ff8840] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={12} className="text-[#00ff88]" />
            </div>
            <div>
              <p className="text-[#00ff88] text-sm font-medium">
                {alert.status === 'RESOLVED' ? 'Alert resolved' : 'Awaiting resolution'}
              </p>
              <p className="text-[#4a6480] font-mono text-[10px] mt-1">Current status: {alert.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
