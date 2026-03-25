import { useCallback, useEffect, useState } from 'react'
import {
  GitBranch,
  Clock,
  Wrench,
  Zap,
  Webhook,
  Shield,
  Database,
  Cpu,
  Layers,
  Lock,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Download,
  Upload,
  Pencil,
  Info,
  Sparkles,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react'
import { fetchConfig, patchConfig, fetchLLMConfig, patchLLMConfig, fetchPrompts, patchPrompts, fetchTools, toggleTool, fetchSkills, toggleSkill, type AgentConfig, type HotConfigPatch, type LLMConfig, type PromptsConfig, type ToolWithStatus, type SkillWithStatus } from '@/lib/api'

/** 配置卡片 */
function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-primary" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      <div className="h-px bg-border mb-4" />
      {children}
    </div>
  )
}

/** 键值行 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  )
}

/** 只读值显示 */
function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-text">{children}</span>
}

/** 布尔状态指示器 */
function StatusDot({ configured, label }: { configured: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {configured
        ? <CheckCircle2 size={12} className="text-success" />
        : <XCircle size={12} className="text-text-muted" />
      }
      <span className={`text-xs font-medium ${configured ? 'text-success' : 'text-text-muted'}`}>
        {label ?? (configured ? 'Configured' : 'Not set')}
      </span>
    </div>
  )
}

/** Immutable 标记 */
function ImmutableBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-warning/10 rounded text-[9px] font-medium text-warning" title="Immutable — set at construction, change via code">
      <Lock size={8} />
      Immutable
    </span>
  )
}

/** 小标签 */
function Tag({ children, variant = 'default' }: { children: string; variant?: 'default' | 'orange' | 'purple' | 'green' }) {
  const styles = {
    default: 'bg-muted text-text-secondary',
    orange: 'bg-primary-light text-primary',
    purple: 'bg-[#EDE7F6] text-purple',
    green: 'bg-[#E8F5E9] text-success',
  }
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${styles[variant]}`}>
      {children}
    </span>
  )
}

/** 可折叠区域 */
function Collapsible({ title, count, defaultOpen, children }: { title: string; count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full text-left py-1">
        {open ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />}
        <span className="text-[10px] font-semibold text-text-muted tracking-wide">{title}</span>
        <span className="text-[10px] text-text-muted">({count})</span>
      </button>
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  )
}

/** 可编辑数值输入 */
function EditableNumber({
  value,
  onSave,
  min = 0,
  saving,
}: {
  value: number
  onSave: (v: number) => void
  min?: number
  saving?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const handleSave = () => {
    const num = parseInt(draft, 10)
    if (!isNaN(num) && num >= min) {
      onSave(num)
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value)); setEditing(true) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-text bg-primary/5 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded cursor-pointer transition-colors group"
        title="Click to edit"
      >
        {value}
        <Pencil size={9} className="text-text-muted group-hover:text-primary transition-colors" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="w-20 h-6 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        <Save size={10} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="px-1.5 py-0.5 text-[10px] font-medium text-text-muted hover:text-text transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

/** 可编辑下拉选择 */
function EditableSelect({
  value,
  options,
  onSave,
  saving,
}: {
  value: string
  options: string[]
  onSave: (v: string) => void
  saving?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true) }}
        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-primary/5 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 text-primary-dark cursor-pointer transition-colors group"
        title="Click to edit"
      >
        {value}
        <Pencil size={9} className="text-text-muted group-hover:text-primary transition-colors" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-6 px-1.5 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
        autoFocus
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        <Save size={10} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="px-1.5 py-0.5 text-[10px] font-medium text-text-muted hover:text-text transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

const CONSOLIDATION_TRIGGERS = ['manual', 'everyNTurns', 'onSwitch', 'onArchive', 'onLeave']
const INTEGRATION_TRIGGERS = ['manual', 'afterConsolidate', 'everyNTurns', 'onSwitch', 'onArchive', 'onLeave']

/** Settings 配置页面 */
export function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null)
  const [llmDraft, setLlmDraft] = useState({ model: '', baseURL: '', apiKey: '', temperature: 0.7, maxTokens: 1024 })
  const [llmEditing, setLlmEditing] = useState(false)
  const [llmSaving, setLlmSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [promptsConfig, setPromptsConfig] = useState<PromptsConfig | null>(null)
  const [promptsEditing, setPromptsEditing] = useState(false)
  const [promptsDraft, setPromptsDraft] = useState({ consolidate: '', integrate: '' })
  const [promptsSaving, setPromptsSaving] = useState(false)
  const [toolsList, setToolsList] = useState<{ configured: boolean; tools: ToolWithStatus[] }>({ configured: false, tools: [] })
  const [skillsList, setSkillsList] = useState<{ configured: boolean; skills: SkillWithStatus[] }>({ configured: false, skills: [] })

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
    fetchLLMConfig()
      .then((cfg) => {
        setLlmConfig(cfg)
        if (cfg.configured) {
          setLlmDraft({ model: cfg.model ?? '', baseURL: cfg.baseURL ?? '', apiKey: cfg.apiKey ?? '', temperature: cfg.temperature ?? 0.7, maxTokens: cfg.maxTokens ?? 1024 })
        }
      })
      .catch(() => {})
    fetchPrompts()
      .then((cfg) => {
        setPromptsConfig(cfg)
        if (cfg.configured) {
          setPromptsDraft({ consolidate: cfg.consolidate ?? '', integrate: cfg.integrate ?? '' })
        }
      })
      .catch(() => {})
    fetchTools().then(setToolsList).catch(() => {})
    fetchSkills().then(setSkillsList).catch(() => {})
  }, [])

  /** 通用 patch 并刷新 state */
  const handlePatch = useCallback(async (patch: HotConfigPatch) => {
    setSaving(true)
    try {
      const result = await patchConfig(patch)
      setConfig(result.config)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [])

  /** 保存 LLM 配置 */
  const handleLLMSave = useCallback(async () => {
    setLlmSaving(true)
    try {
      const result = await patchLLMConfig(llmDraft)
      setLlmConfig(result)
      setLlmEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLlmSaving(false)
    }
  }, [llmDraft])

  /** 导出配置 JSON */
  const handleExport = useCallback(() => {
    if (!config) return
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stello-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [config])

  /** 导入配置 JSON */
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const json = JSON.parse(text) as Record<string, unknown>
        const patch: HotConfigPatch = {}
        if (json.runtime && typeof json.runtime === 'object') {
          const rt = json.runtime as Record<string, unknown>
          if (typeof rt.idleTtlMs === 'number') patch.runtime = { idleTtlMs: rt.idleTtlMs }
        }
        if (json.scheduling && typeof json.scheduling === 'object') {
          patch.scheduling = json.scheduling as HotConfigPatch['scheduling']
        }
        if (json.splitGuard && typeof json.splitGuard === 'object') {
          patch.splitGuard = json.splitGuard as HotConfigPatch['splitGuard']
        }
        if (Object.keys(patch).length > 0) {
          await handlePatch(patch)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid JSON file')
      }
    }
    input.click()
  }, [handlePatch])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="bg-card border border-error/30 rounded-lg px-6 py-4 max-w-md text-center">
          <p className="text-sm font-semibold text-error mb-1">Failed to load config</p>
          <p className="text-xs text-text-muted">{error}</p>
          {config && (
            <button onClick={() => setError(null)} className="mt-2 text-xs text-primary hover:underline">
              Dismiss
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-13 px-6 border-b border-border shrink-0">
        <h2 className="text-[15px] font-semibold text-text">Agent Configuration</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text bg-surface border border-border rounded hover:border-primary transition-colors"
          >
            <Download size={12} />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text bg-surface border border-border rounded hover:border-primary transition-colors"
          >
            <Upload size={12} />
            Import
          </button>
          <Tag variant="green">Live</Tag>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface p-6 space-y-5">
        {/* LLM Provider */}
        <Card title="LLM Provider" icon={Sparkles}>
          {llmConfig?.configured ? (
            llmEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">MODEL</label>
                  <input
                    value={llmDraft.model}
                    onChange={(e) => setLlmDraft((d) => ({ ...d, model: e.target.value }))}
                    className="w-full h-7 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
                    placeholder="gpt-4o"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">BASE URL</label>
                  <input
                    value={llmDraft.baseURL}
                    onChange={(e) => setLlmDraft((d) => ({ ...d, baseURL: e.target.value }))}
                    className="w-full h-7 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">API KEY</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={llmDraft.apiKey}
                      onChange={(e) => setLlmDraft((d) => ({ ...d, apiKey: e.target.value }))}
                      className="flex-1 h-7 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
                      placeholder="sk-..."
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="text-text-muted hover:text-text transition-colors">
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">TEMPERATURE</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={llmDraft.temperature}
                      onChange={(e) => setLlmDraft((d) => ({ ...d, temperature: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-7 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">MAX TOKENS</label>
                    <input
                      type="number"
                      min="1"
                      value={llmDraft.maxTokens}
                      onChange={(e) => setLlmDraft((d) => ({ ...d, maxTokens: parseInt(e.target.value) || 1024 }))}
                      className="w-full h-7 px-2 text-xs font-mono bg-surface border border-border rounded focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleLLMSave}
                    disabled={llmSaving || !llmDraft.model || !llmDraft.baseURL}
                    className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {llmSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Apply
                  </button>
                  <button
                    onClick={() => setLlmEditing(false)}
                    className="px-3 py-1.5 text-[11px] font-medium text-text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Row label="Model">
                  <button
                    onClick={() => { setLlmDraft({ model: llmConfig.model ?? '', baseURL: llmConfig.baseURL ?? '', apiKey: llmConfig.apiKey ?? '', temperature: llmConfig.temperature ?? 0.7, maxTokens: llmConfig.maxTokens ?? 1024 }); setLlmEditing(true) }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-text bg-primary/5 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded cursor-pointer transition-colors group"
                  >
                    {llmConfig.model}
                    <Pencil size={9} className="text-text-muted group-hover:text-primary transition-colors" />
                  </button>
                </Row>
                <Row label="Base URL">
                  <code className="text-[11px] font-mono text-text-secondary max-w-[200px] truncate block" title={llmConfig.baseURL}>{llmConfig.baseURL}</code>
                </Row>
                <Row label="API Key">
                  <span className="text-xs text-text-muted">{llmConfig.apiKey ? '••••••' + llmConfig.apiKey.slice(-4) : '—'}</span>
                </Row>
                <Row label="Temperature">
                  <span className="text-xs font-medium text-text">{llmConfig.temperature ?? '—'}</span>
                </Row>
                <Row label="Max Tokens">
                  <span className="text-xs font-medium text-text">{llmConfig.maxTokens ?? '—'}</span>
                </Row>
              </>
            )
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning/5 rounded-lg border border-warning/15">
              <Info size={12} className="text-warning shrink-0" />
              <p className="text-[10px] text-text-muted">
                Pass <code className="text-[10px] font-mono text-primary-dark">llm</code> option to <code className="text-[10px] font-mono text-primary-dark">startDevtools()</code> to enable LLM switching.
              </p>
            </div>
          )}
        </Card>

        {/* Consolidation / Integration Prompts */}
        <Card title="Consolidation / Integration Prompts" icon={FileText}>
          {promptsConfig?.configured ? (
            promptsEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">CONSOLIDATE PROMPT (L3→L2)</label>
                  <textarea
                    value={promptsDraft.consolidate}
                    onChange={(e) => setPromptsDraft((d) => ({ ...d, consolidate: e.target.value }))}
                    className="w-full h-28 px-2 py-1.5 text-[11px] font-mono bg-surface border border-border rounded-lg focus:border-primary focus:outline-none resize-y leading-relaxed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted tracking-wide block mb-1">INTEGRATE PROMPT (L2→synthesis+insights)</label>
                  <textarea
                    value={promptsDraft.integrate}
                    onChange={(e) => setPromptsDraft((d) => ({ ...d, integrate: e.target.value }))}
                    className="w-full h-28 px-2 py-1.5 text-[11px] font-mono bg-surface border border-border rounded-lg focus:border-primary focus:outline-none resize-y leading-relaxed"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setPromptsSaving(true)
                      try {
                        const result = await patchPrompts(promptsDraft)
                        setPromptsConfig(result)
                        setPromptsEditing(false)
                      } catch { /* ignore */ }
                      setPromptsSaving(false)
                    }}
                    disabled={promptsSaving}
                    className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {promptsSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Apply
                  </button>
                  <button
                    onClick={() => setPromptsEditing(false)}
                    className="px-3 py-1.5 text-[11px] font-medium text-text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 group relative">
                <div>
                  <p className="text-[10px] font-semibold text-text-muted tracking-wide mb-1">CONSOLIDATE</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">{promptsConfig.consolidate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-text-muted tracking-wide mb-1">INTEGRATE</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">{promptsConfig.integrate}</p>
                </div>
                <button
                  onClick={() => { setPromptsDraft({ consolidate: promptsConfig.consolidate ?? '', integrate: promptsConfig.integrate ?? '' }); setPromptsEditing(true) }}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 bg-surface rounded border border-border hover:border-primary transition-all"
                >
                  <Pencil size={10} className="text-text-muted hover:text-primary" />
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning/5 rounded-lg border border-warning/15">
              <Info size={12} className="text-warning shrink-0" />
              <p className="text-[10px] text-text-muted">
                Pass <code className="text-[10px] font-mono text-primary-dark">prompts</code> option to <code className="text-[10px] font-mono text-primary-dark">startDevtools()</code> to enable prompt editing.
              </p>
            </div>
          )}
        </Card>

        {/* Orchestration */}
        <Card title="Orchestration" icon={GitBranch}>
          <Row label="Strategy">
            <div className="flex items-center gap-2">
              <ImmutableBadge />
              <code className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded border border-border text-primary-dark">{config.orchestration.strategy}</code>
            </div>
          </Row>
          <Row label="MainSession">
            <StatusDot configured={config.orchestration.hasMainSession} />
          </Row>
          <Row label="TurnRunner">
            <StatusDot configured={config.orchestration.hasTurnRunner} />
          </Row>
        </Card>

        {/* Scheduling */}
        <Card title="Scheduling Policy" icon={Clock}>
          {!config.scheduling.hasScheduler && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-warning/5 rounded-lg border border-warning/15">
              <Info size={12} className="text-warning shrink-0" />
              <p className="text-[10px] text-text-muted">
                No Scheduler configured — fields are read-only. Pass <code className="text-[10px] font-mono text-primary-dark">scheduler: new Scheduler(...)</code> in orchestration config to enable.
              </p>
            </div>
          )}
          <div className="bg-surface rounded-lg p-3 mb-3">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <span className="font-semibold text-text">Consolidation</span> (L3→L2) 将对话记录提炼为摘要。
              <span className="font-semibold text-text"> Integration</span> 综合所有子 Session 的 L2 生成 synthesis + insights。
            </p>
          </div>
          <Row label="Consolidation Trigger">
            {config.scheduling.hasScheduler ? (
              <EditableSelect
                value={config.scheduling.consolidation.trigger}
                options={CONSOLIDATION_TRIGGERS}
                onSave={(v) => handlePatch({ scheduling: { consolidation: { trigger: v } } })}
                saving={saving}
              />
            ) : (
              <code className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded border border-border text-primary-dark">{config.scheduling.consolidation.trigger}</code>
            )}
          </Row>
          {(config.scheduling.consolidation.trigger === 'everyNTurns') && (
            <Row label="Consolidation Every N">
              {config.scheduling.hasScheduler ? (
                <EditableNumber
                  value={config.scheduling.consolidation.everyNTurns ?? 1}
                  min={1}
                  onSave={(v) => handlePatch({ scheduling: { consolidation: { everyNTurns: v } } })}
                  saving={saving}
                />
              ) : (
                <Value>{config.scheduling.consolidation.everyNTurns} turns</Value>
              )}
            </Row>
          )}
          <Row label="Integration Trigger">
            {config.scheduling.hasScheduler ? (
              <EditableSelect
                value={config.scheduling.integration.trigger}
                options={INTEGRATION_TRIGGERS}
                onSave={(v) => handlePatch({ scheduling: { integration: { trigger: v } } })}
                saving={saving}
              />
            ) : (
              <code className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded border border-border text-primary-dark">{config.scheduling.integration.trigger}</code>
            )}
          </Row>
          {(config.scheduling.integration.trigger === 'everyNTurns') && (
            <Row label="Integration Every N">
              {config.scheduling.hasScheduler ? (
                <EditableNumber
                  value={config.scheduling.integration.everyNTurns ?? 1}
                  min={1}
                  onSave={(v) => handlePatch({ scheduling: { integration: { everyNTurns: v } } })}
                  saving={saving}
                />
              ) : (
                <Value>{config.scheduling.integration.everyNTurns} turns</Value>
              )}
            </Row>
          )}
        </Card>

        {/* Split Guard */}
        <Card title="Split Guard" icon={Shield}>
          {config.splitGuard ? (
            <>
              <Row label="Min Turns Before Split">
                <EditableNumber
                  value={config.splitGuard.minTurns}
                  min={0}
                  onSave={(v) => handlePatch({ splitGuard: { minTurns: v } })}
                  saving={saving}
                />
              </Row>
              <Row label="Cooldown Turns">
                <EditableNumber
                  value={config.splitGuard.cooldownTurns}
                  min={0}
                  onSave={(v) => handlePatch({ splitGuard: { cooldownTurns: v } })}
                  saving={saving}
                />
              </Row>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning/5 rounded-lg border border-warning/15">
              <Info size={12} className="text-warning shrink-0" />
              <p className="text-[10px] text-text-muted">
                No SplitGuard configured. Pass <code className="text-[10px] font-mono text-primary-dark">splitGuard: new SplitGuard(...)</code> in orchestration config to enable.
              </p>
            </div>
          )}
        </Card>

        {/* Runtime */}
        <Card title="Runtime" icon={Cpu}>
          <Row label="Idle Recycle Delay (ms)">
            <EditableNumber
              value={config.runtime.idleTtlMs}
              min={0}
              onSave={(v) => handlePatch({ runtime: { idleTtlMs: v } })}
              saving={saving}
            />
          </Row>
          <Row label="Runtime Resolver">
            <StatusDot configured={config.runtime.hasResolver} label={config.runtime.hasResolver ? 'Custom' : 'Auto (from sessionResolver)'} />
          </Row>
        </Card>

        {/* Session Adapter */}
        <Card title="Session Adapter" icon={Database}>
          <p className="text-[10px] font-semibold text-text-muted tracking-wide mb-2">RESOLVERS</p>
          <Row label="sessionResolver">
            <StatusDot configured={config.session.hasSessionResolver} />
          </Row>
          <Row label="mainSessionResolver">
            <StatusDot configured={config.session.hasMainSessionResolver} />
          </Row>
          <div className="h-px bg-border my-3" />
          <p className="text-[10px] font-semibold text-text-muted tracking-wide mb-2">LIFECYCLE FUNCTIONS</p>
          <Row label="consolidateFn">
            <StatusDot configured={config.session.hasConsolidateFn} />
          </Row>
          <Row label="integrateFn">
            <StatusDot configured={config.session.hasIntegrateFn} />
          </Row>
          <Row label="serializeSendResult">
            <StatusDot configured={config.session.hasSerializeSendResult} label={config.session.hasSerializeSendResult ? 'Custom' : 'Default (JSON)'} />
          </Row>
          <Row label="toolCallParser">
            <StatusDot configured={config.session.hasToolCallParser} label={config.session.hasToolCallParser ? 'Custom' : 'Default'} />
          </Row>
          {config.session.options && (
            <>
              <div className="h-px bg-border my-3" />
              <p className="text-[10px] font-semibold text-text-muted tracking-wide mb-2">SESSION OPTIONS</p>
              <pre className="text-[10px] font-mono bg-surface rounded-lg p-2 border border-border text-text-secondary overflow-x-auto">
                {JSON.stringify(config.session.options, null, 2)}
              </pre>
            </>
          )}
        </Card>

        {/* Capabilities */}
        <Card title="Capabilities" icon={Layers}>
          <Row label="Lifecycle Adapter">
            <StatusDot configured={config.capabilities.hasLifecycle} />
          </Row>
          <Row label="Confirm Protocol">
            <StatusDot configured={config.capabilities.hasConfirm} />
          </Row>

          <div className="h-px bg-border my-3" />
          <Collapsible title="TOOLS" count={config.capabilities.tools.length} defaultOpen={config.capabilities.tools.length <= 5}>
            {(toolsList.configured ? toolsList.tools : config.capabilities.tools.map((t) => ({ ...t, enabled: true }))).map((tool) => (
              <div key={tool.name} className="flex items-center gap-2 pl-2 py-0.5">
                <Wrench size={12} className={`shrink-0 ${tool.enabled ? 'text-primary' : 'text-text-muted'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${tool.enabled ? 'text-text' : 'text-text-muted line-through'}`}>{tool.name}</span>
                  <p className="text-[10px] text-text-muted truncate">{tool.description}</p>
                </div>
                {toolsList.configured && (
                  <button
                    onClick={async () => {
                      const result = await toggleTool(tool.name, !tool.enabled)
                      setToolsList((prev) => ({ ...prev, tools: result.tools }))
                    }}
                    className={`shrink-0 w-8 h-4 rounded-full transition-colors relative ${tool.enabled ? 'bg-primary' : 'bg-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${tool.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                )}
              </div>
            ))}
            {config.capabilities.tools.length === 0 && (
              <p className="text-[11px] text-text-muted italic pl-2">No tools registered</p>
            )}
          </Collapsible>

          <div className="h-px bg-border my-3" />
          <Collapsible title="SKILLS" count={config.capabilities.skills.length} defaultOpen={config.capabilities.skills.length <= 5}>
            {(skillsList.configured ? skillsList.skills : config.capabilities.skills.map((s) => ({ ...s, enabled: true }))).map((skill) => (
              <div key={skill.name} className="flex items-center gap-2 pl-2 py-0.5">
                <Zap size={12} className={`shrink-0 ${skill.enabled ? 'text-[#D89575]' : 'text-text-muted'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${skill.enabled ? 'text-text' : 'text-text-muted line-through'}`}>{skill.name}</span>
                  <p className="text-[10px] text-text-muted truncate">{skill.description}</p>
                </div>
                {skillsList.configured && (
                  <button
                    onClick={async () => {
                      const result = await toggleSkill(skill.name, !skill.enabled)
                      setSkillsList((prev) => ({ ...prev, skills: result.skills }))
                    }}
                    className={`shrink-0 w-8 h-4 rounded-full transition-colors relative ${skill.enabled ? 'bg-primary' : 'bg-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${skill.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                )}
              </div>
            ))}
            {config.capabilities.skills.length === 0 && (
              <p className="text-[11px] text-text-muted italic pl-2">No skills registered</p>
            )}
          </Collapsible>
        </Card>

        {/* Hooks */}
        <Card title="Engine Hooks" icon={Webhook}>
          {config.hooks.length > 0 ? (
            <div className="space-y-2">
              {config.hooks.map((hook) => (
                <div key={hook} className="flex items-center gap-2">
                  <Webhook size={12} className="text-purple shrink-0" />
                  <span className="text-xs font-medium text-text">{hook}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted italic">No hooks registered</p>
          )}
        </Card>
      </div>
    </div>
  )
}
