import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { fetchConfig, type AgentConfig } from '@/lib/api'

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

/** 代码风格值 */
function CodeValue({ children }: { children: string }) {
  return <code className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded border border-border text-primary-dark">{children}</code>
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

/** Settings 配置页面（只读） */
export function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-13 px-6 border-b border-border shrink-0">
        <h2 className="text-[15px] font-semibold text-text">Agent Configuration</h2>
        <Tag variant="default">Read-only</Tag>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface p-6 space-y-5">
        {/* Orchestration */}
        <Card title="Orchestration" icon={GitBranch}>
          <Row label="Strategy">
            <div className="flex items-center gap-2">
              <ImmutableBadge />
              <CodeValue>{config.orchestration.strategy}</CodeValue>
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
          <div className="flex items-center gap-2 mb-3">
            <ImmutableBadge />
            {!config.scheduling.hasScheduler && <Tag variant="default">No scheduler — manual only</Tag>}
          </div>
          <div className="bg-surface rounded-lg p-3 mb-3">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <span className="font-semibold text-text">Consolidation</span> (L3→L2) 将对话记录提炼为摘要。
              <span className="font-semibold text-text"> Integration</span> 综合所有子 Session 的 L2 生成 synthesis + insights。
            </p>
          </div>
          <Row label="Consolidation Trigger">
            <CodeValue>{config.scheduling.consolidation.trigger}</CodeValue>
          </Row>
          {config.scheduling.consolidation.everyNTurns && (
            <Row label="Consolidation Every N">
              <Value>{config.scheduling.consolidation.everyNTurns} turns</Value>
            </Row>
          )}
          <Row label="Integration Trigger">
            <CodeValue>{config.scheduling.integration.trigger}</CodeValue>
          </Row>
          {config.scheduling.integration.everyNTurns && (
            <Row label="Integration Every N">
              <Value>{config.scheduling.integration.everyNTurns} turns</Value>
            </Row>
          )}
        </Card>

        {/* Split Guard */}
        <Card title="Split Guard" icon={Shield}>
          <div className="flex items-center gap-2 mb-3">
            <ImmutableBadge />
          </div>
          {config.splitGuard ? (
            <>
              <Row label="Min Turns Before Split">
                <Value>{config.splitGuard.minTurns}</Value>
              </Row>
              <Row label="Cooldown Turns">
                <Value>{config.splitGuard.cooldownTurns}</Value>
              </Row>
            </>
          ) : (
            <p className="text-[11px] text-text-muted italic">No SplitGuard configured — no split restrictions</p>
          )}
        </Card>

        {/* Runtime */}
        <Card title="Runtime" icon={Cpu}>
          <Row label="Idle Recycle Delay">
            <div className="flex items-center gap-2">
              <Value>{config.runtime.idleTtlMs === 0 ? 'Immediate' : `${config.runtime.idleTtlMs} ms`}</Value>
              <Tag variant="green">Hot-updatable</Tag>
            </div>
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
            {config.capabilities.tools.map((tool) => (
              <div key={tool.name} className="flex items-start gap-2 pl-2">
                <Wrench size={12} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-text">{tool.name}</span>
                  <p className="text-[10px] text-text-muted truncate">{tool.description}</p>
                </div>
              </div>
            ))}
            {config.capabilities.tools.length === 0 && (
              <p className="text-[11px] text-text-muted italic pl-2">No tools registered</p>
            )}
          </Collapsible>

          <div className="h-px bg-border my-3" />
          <Collapsible title="SKILLS" count={config.capabilities.skills.length} defaultOpen={config.capabilities.skills.length <= 5}>
            {config.capabilities.skills.map((skill) => (
              <div key={skill.name} className="flex items-start gap-2 pl-2">
                <Zap size={12} className="text-[#D89575] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-text">{skill.name}</span>
                  <p className="text-[10px] text-text-muted truncate">{skill.description}</p>
                </div>
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
