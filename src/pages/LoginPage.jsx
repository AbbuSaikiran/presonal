import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
  Building,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react'

const DEMO_ACCOUNTS = [
  {
    name: 'Sarah Connor (Admin)',
    email: 'admin@sybrai.io',
    pass: 'Admin@1234',
    role: 'Administrator',
    dept: 'Cyber Command',
  },
  {
    name: 'Marcus Vance',
    email: 'analyst@sybrai.io',
    pass: 'Analyst@1234',
    role: 'SOC Analyst',
    dept: 'Incident Response',
  },
  {
    name: 'Elena Rostova',
    email: 'hunter@sybrai.io',
    pass: 'Hunter@1234',
    role: 'Threat Hunter',
    dept: 'Threat Intel',
  },
]

export default function LoginPage() {
  const { login, register, forgotPassword, resetPassword, isLoading, loginError, authSuccess, clearError } = useAuth()

  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register' | 'forgot'
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Registration fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regRole, setRegRole] = useState('ADMIN')
  const [regDepartment, setRegDepartment] = useState('Cyber Defense Command')
  const [showRegPass, setShowRegPass] = useState(false)

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotStep, setForgotStep] = useState(1) // 1 = request code, 2 = reset password
  const [localMsg, setLocalMsg] = useState(null)

  function switchTab(tab) {
    setActiveTab(tab)
    clearError()
    setLocalMsg(null)
  }

  function fillCredentials(cred) {
    setLoginEmail(cred.email)
    setLoginPassword(cred.pass)
    clearError()
  }

  async function handleLoginSubmit(e) {
    e.preventDefault()
    clearError()
    setLocalMsg(null)
    await login(loginEmail.trim(), loginPassword)
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault()
    clearError()
    setLocalMsg(null)

    if (regPassword !== regConfirmPassword) {
      setLocalMsg({ type: 'error', text: 'Passwords do not match. Please verify.' })
      return
    }

    if (regPassword.length < 6) {
      setLocalMsg({ type: 'error', text: 'Password must be at least 6 characters long.' })
      return
    }

    const ok = await register(regName.trim(), regEmail.trim(), regPassword, regRole, regDepartment)
    if (ok) {
      setLocalMsg({ type: 'success', text: 'Account created successfully! Redirecting...' })
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    clearError()
    setLocalMsg(null)

    if (forgotStep === 1) {
      const res = await forgotPassword(forgotEmail.trim())
      setForgotStep(2)
      setLocalMsg({ type: 'success', text: res.message || `Recovery verification code sent to ${forgotEmail}. (Demo code: 894201)` })
      setResetCode(res.code || '894201')
    } else {
      if (newPassword.length < 6) {
        setLocalMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
        return
      }
      const ok = await resetPassword(forgotEmail.trim(), resetCode.trim(), newPassword)
      if (ok) {
        setLocalMsg({ type: 'success', text: 'Password reset successfully! You can now sign in.' })
        setTimeout(() => {
          setLoginEmail(forgotEmail)
          setLoginPassword(newPassword)
          switchTab('login')
        }, 1500)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] bg-grid bg-[length:40px_40px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d4ff08] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ff336608] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00d4ff04] rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg animate-slide-up z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#0099bb] shadow-[0_0_40px_rgba(0,212,255,0.4)] mb-3">
            <Shield size={32} className="text-[#080c14]" />
          </div>
          <h1 className="text-[#e2eaf5] text-2xl font-bold tracking-tight">SYBRAI CYBER DEFENSE</h1>
          <p className="text-[#4a6480] text-xs font-mono uppercase tracking-widest mt-1">
            Enterprise Security Operations & MCP Control Center
          </p>
        </div>

        {/* Auth Card */}
        <div className="cyber-card-glow p-7 bg-[#0d1520] border border-[#1a2d45] rounded-2xl shadow-2xl">
          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-[#111d2e] p-1 mb-6 border border-[#1a2d45]">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-all ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099bb] text-[#080c14] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'text-[#7a94b5] hover:text-[#e2eaf5]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-all ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099bb] text-[#080c14] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'text-[#7a94b5] hover:text-[#e2eaf5]'
              }`}
            >
              Register Admin
            </button>
            <button
              onClick={() => switchTab('forgot')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-all ${
                activeTab === 'forgot'
                  ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099bb] text-[#080c14] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'text-[#7a94b5] hover:text-[#e2eaf5]'
              }`}
            >
              Recovery
            </button>
          </div>

          {/* Feedback messages */}
          {loginError && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[#ff336610] border border-[#ff336640] text-[#ff3366] text-xs animate-fade-in">
              <AlertCircle size={15} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {localMsg && (
            <div
              className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-xs animate-fade-in ${
                localMsg.type === 'error'
                  ? 'bg-[#ff336610] border border-[#ff336640] text-[#ff3366]'
                  : 'bg-[#00ff8810] border border-[#00ff8840] text-[#00ff88]'
              }`}
            >
              {localMsg.type === 'error' ? <AlertCircle size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0" />}
              <span>{localMsg.text}</span>
            </div>
          )}

          {authSuccess && !localMsg && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[#00ff8810] border border-[#00ff8840] text-[#00ff88] text-xs animate-fade-in">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@sybrai.io"
                    className="cyber-input pl-10 text-xs"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTab('forgot')}
                    className="text-[11px] text-[#00d4ff] hover:underline font-mono"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="cyber-input pl-10 pr-10 text-xs"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6480] hover:text-[#7a94b5] transition-colors"
                  >
                    {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#7a94b5]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#111d2e] border-[#1a2d45] accent-[#00d4ff]"
                  />
                  <span>Remember operator session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !loginEmail || !loginPassword}
                className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2 py-3 mt-3 text-xs font-bold uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Authenticate & Access Dashboard</span>
                  </>
                )}
              </button>

              {/* 1-Click Demo Credentials */}
              <div className="mt-5 pt-4 border-t border-[#1a2d45]">
                <p className="text-[10px] font-mono text-[#4a6480] uppercase tracking-widest text-center mb-2.5">
                  1-Click Instant Demo Credentials
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onClick={() => fillCredentials(c)}
                      className="p-2.5 rounded-lg bg-[#111d2e] border border-[#1a2d45] hover:border-[#00d4ff40] hover:bg-[#16263d] text-left transition-all group"
                    >
                      <p className="font-mono text-[#00d4ff] text-[11px] font-bold truncate group-hover:text-white">
                        {c.role}
                      </p>
                      <p className="text-[#7a94b5] text-[9px] truncate mt-0.5">{c.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                  Full Name & Designation
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Sarah Connor (Admin)"
                    className="cyber-input pl-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@sybrai.io"
                    className="cyber-input pl-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                    Security Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-xs text-[#e2eaf5] font-mono focus:border-[#00d4ff] focus:outline-none"
                  >
                    <option value="ADMIN">Administrator (Full)</option>
                    <option value="ANALYST">SOC Analyst</option>
                    <option value="OPERATOR">Incident Operator</option>
                    <option value="VIEWER">Read-Only Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="Cyber Command"
                      className="cyber-input pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="cyber-input pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="cyber-input pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !regName || !regEmail || !regPassword}
                className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4 text-xs font-bold uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Operator Account...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Create & Launch Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-xs text-[#7a94b5] leading-relaxed">
                <span className="text-[#00d4ff] font-semibold">Self-Service Account Recovery:</span> Enter your registered operator email to receive a secure recovery code.
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@sybrai.io"
                    className="cyber-input pl-10 text-xs"
                    required
                  />
                </div>
              </div>

              {forgotStep === 2 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">
                      Recovery Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="894201"
                        className="cyber-input pl-10 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#7a94b5] uppercase tracking-widest mb-1.5">
                      New Strong Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6480]" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="cyber-input pl-10 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !forgotEmail}
                className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : forgotStep === 1 ? (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Reset Password & Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs text-[#7a94b5] hover:text-[#00d4ff] font-mono transition-colors"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[#4a6480] text-[11px] font-mono mt-5">
          Sybrai Autonomous SOC · Multi-User Admin & Role-Based Access Control
        </p>
      </div>
    </div>
  )
}
