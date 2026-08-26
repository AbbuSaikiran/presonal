import React, { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Terminal,
  Server,
  Zap,
  Play,
  Send,
  RefreshCw,
  Cpu,
  Layers,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Database,
  Clock,
  Sparkles,
  Search,
  Code2,
} from 'lucide-react'

const QUICK_PROMPTS = [
  { label: 'Query Critical Alerts', prompt: 'Query the most critical active security alerts in our database and analyze the MITRE ATT&CK tactics.' },
  { label: 'Test Telemetry Anomaly', prompt: 'Score incoming telemetry from 185.220.101.57 targeting port 5432 with 320 attempts using the anomaly detection engine.' },
  { label: 'Inspect Database Server', prompt: 'Inspect the status and active connections on device db-server-01.' },
  { label: 'Supabase SQL Query', prompt: 'Execute a read query on the Supabase database to inspect recent security alert records.' },
  { label: 'Search GitHub Repos', prompt: 'Search GitHub repositories for sybrai cybersecurity components.' },
]

export default function MCPAgentConsole() {
  const [servers, setServers] = useState([])
  const [totalTools, setTotalTools] = useState(0)
  const [runnerStatus, setRunnerStatus] = useState(null)
  const [selectedModel, setSelectedModel] = useState('llama3.1:latest')
  const [temperature, setTemperature] = useState(0.2)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedServers, setExpandedServers] = useState({})
  
  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hello! I am **Sybrai AI**, powered by your **Local LLM Runner** with autonomous access to your **Model Context Protocol (MCP)** ecosystem.\n\nI can dynamically invoke tools across **Supabase, GitHub, BigQuery, Firebase, PostHog**, and local **Security Detection Engines** to inspect threats and execute operations.',
      steps: [],
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState({})
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchStatusAndServers()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const fetchStatusAndServers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/mcp/status')
      if (res.ok) {
        const data = await res.json()
        setServers(data.servers || [])
        setTotalTools(data.total_tools_count || 0)
        setRunnerStatus(data.llm_runner || null)
        if (data.llm_runner?.active_model) {
          setSelectedModel(data.llm_runner.active_model)
        }
      }
    } catch (err) {
      console.warn('Backend MCP endpoint unreachable, using fallback preview data', err)
      // Fallback display
      setRunnerStatus({
        online: true,
        provider: 'ollama',
        base_url: 'http://localhost:11434',
        available_models: ['llama3.1:latest', 'qwen2.5-coder:7b', 'mistral:latest', 'deepseek-r1:7b'],
        active_model: 'llama3.1:latest',
      })
      setServers([
        {
          name: 'sybrai-core',
          type: 'builtin',
          status: 'connected',
          tool_count: 3,
          tools: [
            { name: 'sybrai_core__query_security_alerts', description: 'Query recent cybersecurity alerts' },
            { name: 'sybrai_core__run_anomaly_prediction', description: 'Score telemetry with Isolation Forest' },
            { name: 'sybrai_core__inspect_network_device', description: 'Inspect host security posture' },
          ],
        },
        {
          name: 'supabase',
          type: 'sse',
          status: 'configured',
          tool_count: 2,
          tools: [
            { name: 'supabase__execute_sql', description: 'Execute read-only SQL query' },
            { name: 'supabase__list_tables', description: 'List database schema tables' },
          ],
        },
        {
          name: 'github-mcp-server',
          type: 'stdio',
          status: 'configured',
          tool_count: 2,
          tools: [
            { name: 'github__search_repositories', description: 'Search GitHub repositories' },
            { name: 'github__list_issues', description: 'List issues or PRs' },
          ],
        },
      ])
      setTotalTools(7)
    }
  }

  const toggleServerExpand = (name) => {
    setExpandedServers((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const toggleStepExpand = (msgIndex, stepIndex) => {
    const key = `${msgIndex}-${stepIndex}`
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSendMessage = async (customPrompt) => {
    const promptToSend = customPrompt || inputPrompt
    if (!promptToSend.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputPrompt('')
    setIsLoading(true)

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('http://localhost:8000/api/mcp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: historyPayload,
          model: selectedModel,
          temperature: parseFloat(temperature),
          max_iterations: 5,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const botMessage = {
          role: 'assistant',
          content: data.response || 'Task executed successfully.',
          steps: data.steps || [],
          model_used: data.model_used,
          provider: data.provider,
          tools_invoked_count: data.tools_invoked_count || 0,
          timestamp: new Date().toLocaleTimeString(),
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        const errText = await res.text()
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Error executing agent request: ${errText || res.statusText}`,
            steps: [],
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to connect to Sybrai backend API at http://localhost:8000/api/mcp/chat. Error: ${err.message}`,
          steps: [],
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tools?.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1a2d45] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff20] to-[#0099bb10] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.2)]">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e2eaf5] tracking-wide flex items-center gap-2">
                Local LLM & MCP Agent Hub
                <span className="text-[10px] font-mono uppercase bg-[#00d4ff15] text-[#00d4ff] border border-[#00d4ff30] px-2 py-0.5 rounded-full">
                  Autonomous Tool Calling
                </span>
              </h1>
              <p className="text-xs text-[#7a94b5]">
                Execute multi-turn reasoning and tool workflows with local models across {totalTools} MCP tools.
              </p>
            </div>
          </div>
        </div>

        {/* Runner Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${runnerStatus?.online ? 'bg-[#00ff88] animate-pulse' : 'bg-[#ff8c42]'}`} />
            <span className="text-[#e2eaf5]">
              {runnerStatus?.provider?.toUpperCase() || 'RUNNER'}: {runnerStatus?.online ? 'ONLINE' : 'FALLBACK'}
            </span>
          </div>
          <button
            onClick={fetchStatusAndServers}
            className="p-2 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-[#7a94b5] hover:text-[#00d4ff] hover:border-[#00d4ff40] transition-colors"
            title="Refresh status"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Tool Explorer & Config | Right = Interactive Chat Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Server Explorer & Model Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Model Configuration Card */}
          <div className="rounded-xl bg-[#0d1520] border border-[#1a2d45] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#1a2d45] pb-2.5">
              <span className="text-xs font-mono font-semibold text-[#e2eaf5] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} className="text-[#00d4ff]" /> Model Settings
              </span>
              <span className="text-[10px] font-mono text-[#00ff88]">Ollama / vLLM</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#7a94b5] block mb-1">Active Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-[#e2eaf5] font-mono focus:border-[#00d4ff] focus:outline-none"
                >
                  {(runnerStatus?.available_models || ['llama3.1:latest', 'qwen2.5-coder:7b', 'mistral:latest', 'deepseek-r1:7b']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[#7a94b5] mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-[#00d4ff]">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full accent-[#00d4ff] bg-[#111d2e] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="pt-1 text-[11px] text-[#4a6480] flex items-center justify-between border-t border-[#1a2d45]">
                <span>Base URL</span>
                <span className="font-mono text-[#7a94b5]">{runnerStatus?.base_url || 'http://localhost:11434'}</span>
              </div>
            </div>
          </div>

          {/* MCP Servers & Tools Explorer */}
          <div className="rounded-xl bg-[#0d1520] border border-[#1a2d45] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold text-[#e2eaf5] uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#00d4ff]" /> MCP Services ({servers.length})
              </span>
              <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff10] px-2 py-0.5 rounded">
                {totalTools} tools
              </span>
            </div>

            {/* Search Tools */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-2.5 text-[#4a6480]" />
              <input
                type="text"
                placeholder="Search MCP services or tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-xs text-[#e2eaf5] placeholder-[#4a6480] focus:border-[#00d4ff] focus:outline-none font-mono"
              />
            </div>

            {/* Server Accordion List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredServers.map((srv) => (
                <div
                  key={srv.name}
                  className="rounded-lg bg-[#111d2e] border border-[#1a2d45] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleServerExpand(srv.name)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#16253b] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {srv.type === 'sse' ? (
                        <Database size={13} className="text-[#ff8c42] shrink-0" />
                      ) : srv.type === 'builtin' ? (
                        <Zap size={13} className="text-[#00ff88] shrink-0" />
                      ) : (
                        <Server size={13} className="text-[#00d4ff] shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-[#e2eaf5] truncate">{srv.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#080c14] text-[#7a94b5]">
                        {srv.type}
                      </span>
                      <span className="text-[10px] font-mono text-[#00d4ff]">
                        {srv.tool_count || srv.tools?.length || 0}
                      </span>
                      {expandedServers[srv.name] ? (
                        <ChevronDown size={13} className="text-[#7a94b5]" />
                      ) : (
                        <ChevronRight size={13} className="text-[#7a94b5]" />
                      )}
                    </div>
                  </button>

                  {expandedServers[srv.name] && (
                    <div className="px-3 pb-3 pt-1 border-t border-[#1a2d45] space-y-2 bg-[#0a111b]">
                      {srv.tools?.map((tool) => (
                        <div
                          key={tool.name}
                          className="p-2 rounded bg-[#111d2e] border border-[#1a2d45]/60 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-mono text-[#00d4ff] font-medium mb-1">
                            <span className="truncate">{tool.original_name || tool.name}</span>
                            <button
                              onClick={() => handleSendMessage(`Execute ${tool.name} with default parameters`)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[#00d4ff15] text-[#00d4ff] hover:bg-[#00d4ff30] transition-colors"
                            >
                              Run
                            </button>
                          </div>
                          <p className="text-[#7a94b5] line-clamp-2 text-[10px] leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Agent Chat & Reasoning Console (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[700px] rounded-xl bg-[#0d1520] border border-[#1a2d45] shadow-2xl overflow-hidden">
          {/* Console Header */}
          <div className="px-5 py-3.5 border-b border-[#1a2d45] bg-[#0a111a] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-[#00d4ff]" />
              <span className="text-xs font-mono font-bold text-[#e2eaf5] uppercase tracking-wider">
                MCP Agent Execution Console
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#7a94b5]">
              <span>Model: <strong className="text-[#00d4ff]">{selectedModel}</strong></span>
              <span>•</span>
              <span>Temp: <strong className="text-[#00d4ff]">{temperature}</strong></span>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 border-b border-[#1a2d45] bg-[#0d1520] flex items-center gap-2 overflow-x-auto shrink-0">
            <Sparkles size={13} className="text-[#00d4ff] shrink-0" />
            <span className="text-[10px] font-mono text-[#4a6480] uppercase tracking-wider shrink-0">Quick Prompts:</span>
            {QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#111d2e] border border-[#1a2d45] text-[#7a94b5] hover:text-[#00d4ff] hover:border-[#00d4ff40] hover:bg-[#00d4ff0a] transition-all whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
            {messages.map((msg, mIdx) => (
              <div
                key={mIdx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff30] to-[#0099bb10] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff] shrink-0 mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#00d4ff15] border border-[#00d4ff40] text-[#e2eaf5] shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                      : 'bg-[#111d2e] border border-[#1a2d45] text-[#d1e0f0]'
                  }`}
                >
                  {/* Tool Execution Steps Trace */}
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="mb-3.5 space-y-2 border-b border-[#1a2d45] pb-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#00d4ff]">
                        <span className="flex items-center gap-1.5">
                          <Zap size={13} className="text-[#00ff88]" />
                          Executed {msg.steps.length} MCP Tool{msg.steps.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-[#4a6480]">Autonomous Flow</span>
                      </div>

                      {msg.steps.map((step, sIdx) => {
                        const stepKey = `${mIdx}-${sIdx}`
                        const isExpanded = expandedSteps[stepKey]
                        return (
                          <div
                            key={sIdx}
                            className="rounded-lg bg-[#0a111b] border border-[#1a2d45] overflow-hidden text-[11px]"
                          >
                            <button
                              onClick={() => toggleStepExpand(mIdx, sIdx)}
                              className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-[#111d2e] transition-colors text-left"
                            >
                              <div className="flex items-center gap-1.5 font-mono text-[#e2eaf5]">
                                <CheckCircle2 size={12} className="text-[#00ff88]" />
                                <span className="text-[#00d4ff] font-semibold">{step.tool}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[10px] text-[#7a94b5]">
                                <span>{step.duration_ms}ms</span>
                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-2.5 border-t border-[#1a2d45] space-y-2 bg-[#080c14] font-mono text-[10px]">
                                <div>
                                  <span className="text-[#4a6480] uppercase">Input Arguments:</span>
                                  <pre className="mt-1 p-1.5 rounded bg-[#111d2e] text-[#a0c0e0] overflow-x-auto">
                                    {JSON.stringify(step.arguments, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-[#4a6480] uppercase">Tool Output:</span>
                                  <pre className="mt-1 p-1.5 rounded bg-[#111d2e] text-[#00ff88] overflow-x-auto">
                                    {JSON.stringify(step.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                    {msg.content}
                  </div>

                  {/* Message Timestamp & Metadata */}
                  <div className="mt-2.5 pt-2 border-t border-[#1a2d45]/50 flex items-center justify-between text-[10px] font-mono text-[#4a6480]">
                    <span>{msg.timestamp}</span>
                    {msg.model_used && (
                      <span className="text-[#7a94b5]">
                        via <strong className="text-[#00d4ff]">{msg.model_used}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff20] to-[#00d4ff05] border border-[#00d4ff30] flex items-center justify-center text-[#00d4ff] shrink-0 mt-1 font-mono text-xs font-bold">
                    ME
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff30] to-[#0099bb10] border border-[#00d4ff40] flex items-center justify-center text-[#00d4ff] shrink-0 mt-1">
                  <Bot size={16} />
                </div>
                <div className="rounded-xl p-4 bg-[#111d2e] border border-[#1a2d45] text-xs flex items-center gap-3">
                  <RefreshCw size={14} className="text-[#00d4ff] animate-spin" />
                  <span className="text-[#7a94b5] font-mono">
                    Agent reasoning with local model & evaluating MCP tools...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-[#1a2d45] bg-[#0a111a] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask the local LLM agent to inspect alerts, run SQL queries, or score anomalies..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#111d2e] border border-[#1a2d45] text-xs text-[#e2eaf5] placeholder-[#4a6480] focus:border-[#00d4ff] focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0099bb] text-[#080c14] font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,212,255,0.3)]"
              >
                <span>Send</span>
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
