import { useState } from 'react'
import {
  Search,
  Zap,
  Wrench,
  Terminal,
  ArrowUp,
  ArrowDownRight,
} from 'lucide-react'

/** Session 列表项 */
interface SessionItem {
  id: string
  label: string
  turns: number
  status: 'active' | 'archived'
  color: string
}

/** 对话消息 */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: { name: string; args: string; duration: string }
}

/** Mock session 列表 */
const mockSessions: SessionItem[] = [
  { id: 'sess-1', label: 'research', turns: 12, status: 'active', color: '#3D8A5A' },
  { id: 'sess-2', label: 'coding', turns: 8, status: 'active', color: '#B8956A' },
  { id: 'sess-main', label: 'Main Session', turns: 24, status: 'active', color: '#C4A882' },
  { id: 'sess-3', label: 'papers', turns: 4, status: 'active', color: '#A8C4A0' },
  { id: 'sess-4', label: 'old-api', turns: 6, status: 'archived', color: '#D89575' },
]

/** Mock 对话 */
const mockMessages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Search for recent papers on conversation topology' },
  {
    id: '2',
    role: 'assistant',
    content: 'I found 3 relevant papers on conversation branching and session topology. Let me summarize the key findings...',
    toolCall: { name: 'search_papers', args: '{"query": "conversation topology"}', duration: '1.2s' },
  },
  { id: '3', role: 'user', content: 'Can you focus on the ones from 2024?' },
  {
    id: '4',
    role: 'assistant',
    content: 'Filtering for 2024 publications. Here are the two most relevant:\n\n1. "Branching Dialogue Trees for Multi-Agent Systems" — Chen et al.\n2. "Session Topology in LLM Orchestration" — Park & Kim',
    toolCall: { name: 'search_papers', args: '{"query": "...", "year": 2024}', duration: '0.8s' },
  },
]

/** Mock L3 记录 */
const mockL3Records = [
  { role: 'user' as const, text: 'Search for recent papers on...' },
  { role: 'asst' as const, text: 'I found 3 relevant papers...' },
  { role: 'tool' as const, text: 'search_papers → 3 results' },
  { role: 'user' as const, text: 'Can you focus on the ones from 2024?' },
  { role: 'asst' as const, text: 'Filtering for 2024 publications...' },
]

/** 角色 badge */
function RoleBadge({ role }: { role: 'user' | 'asst' | 'tool' }) {
  const styles = {
    user: 'bg-primary-light text-primary',
    asst: 'bg-muted text-text-secondary',
    tool: 'bg-[#FFF5EE] text-primary',
  }
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${styles[role]}`}>
      {role}
    </span>
  )
}

/** Conversation 对话栏页面 */
export function Conversation() {
  const [selectedSession, setSelectedSession] = useState(mockSessions[0]!)
  const [activeTab, setActiveTab] = useState<'l3' | 'l2' | 'insights' | 'prompt'>('l3')

  return (
    <div className="flex h-full">
      {/* 左侧 Session 列表 */}
      <div className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        {/* 列表头 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="text-sm font-semibold text-text">Sessions</span>
          <span className="text-xs text-text-muted">{mockSessions.length}</span>
        </div>
        {/* 搜索 */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-2.5 h-8 bg-surface rounded-lg border border-border">
            <Search size={14} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Filter sessions..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-text-muted"
            />
          </div>
        </div>
        {/* Session 列表 */}
        <div className="flex-1 overflow-y-auto">
          {mockSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s)}
              className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-left transition-colors ${
                selectedSession.id === s.id ? 'bg-primary-light' : 'hover:bg-surface'
              }`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] truncate ${selectedSession.id === s.id ? 'font-semibold text-text' : 'font-medium text-text'}`}>
                  {s.label}
                </div>
                <div className="text-[10px] text-text-secondary">
                  {s.turns} turns · {s.status === 'active' ? 'Active' : 'Archived'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 中间对话区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 对话 Header */}
        <div className="flex items-center justify-between h-13 px-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedSession.color }} />
            <span className="text-[15px] font-semibold text-text">{selectedSession.label}</span>
            <span className="text-[10px] font-medium text-text-secondary bg-muted px-2 py-0.5 rounded-full">
              {selectedSession.turns} turns
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-md border border-border">
              <Zap size={12} className="text-[#D89575]" />
              <span className="text-[11px] font-medium text-text-secondary">3 Skills</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-md border border-border">
              <Wrench size={12} className="text-text-secondary" />
              <span className="text-[11px] font-medium text-text-secondary">5 Tools</span>
            </div>
          </div>
        </div>

        {/* 消息流 */}
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-5 space-y-4">
          {mockMessages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-white rounded-xl rounded-br-sm px-3.5 py-2.5 max-w-md">
                    <p className="text-[13px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-card rounded-xl rounded-bl-sm px-3.5 py-2.5 max-w-lg shadow-sm border border-border/30">
                    <p className="text-[13px] text-text leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                  {msg.toolCall && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFF5EE] rounded-lg border border-primary/20">
                      <Terminal size={12} className="text-primary" />
                      <span className="text-[11px] font-medium text-primary-dark">
                        {msg.toolCall.name}({msg.toolCall.args})
                      </span>
                      <span className="text-[10px] text-text-muted">{msg.toolCall.duration}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 输入栏 */}
        <div className="flex items-center gap-2.5 h-14 px-5 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-2 flex-1 h-9 px-3 bg-surface rounded-[10px] border border-border">
            <Terminal size={14} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Send a message or simulate a tool call..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-text-muted"
            />
          </div>
          <button className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
            <ArrowUp size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* 右侧上下文面板 */}
      <div className="w-75 bg-card border-l border-border flex flex-col shrink-0">
        {/* Header */}
        <div className="flex items-center h-13 px-4 border-b border-border">
          <span className="text-sm font-semibold text-text">Context</span>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-border">
          {(['l3', 'l2', 'insights', 'prompt'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab === 'l3' ? 'L3' : tab === 'l2' ? 'L2' : tab === 'insights' ? 'Insights' : 'Prompt'}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto bg-surface p-4 space-y-3">
          {activeTab === 'l3' && (
            <>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">SYSTEM PROMPT</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30">
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  You are a research assistant specialized in finding and summarizing academic papers...
                </p>
              </div>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">INSIGHTS FROM MAIN</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30">
                <div className="flex items-center gap-1 mb-1.5">
                  <ArrowDownRight size={10} className="text-primary" />
                  <span className="text-[10px] font-medium text-primary">Latest integration</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Focus on recent 2024 publications. The coding session has identified key APIs that may relate to your findings.
                </p>
              </div>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">L3 HISTORY ({mockL3Records.length} RECORDS)</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30 space-y-2">
                {mockL3Records.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <RoleBadge role={r.role} />
                    <span className="text-[11px] text-text-secondary">{r.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'l2' && (
            <>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">L2 MEMORY</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-medium text-success bg-[#E8F5E9] px-1.5 py-0.5 rounded">consolidated</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  This session focuses on academic research in conversation topology. Key findings include
                  tree-structured dialogue management, cross-branch knowledge transfer via synthesis, and
                  session lifecycle patterns.
                </p>
              </div>
            </>
          )}

          {activeTab === 'insights' && (
            <>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">INSIGHTS FROM MAIN</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30">
                <div className="flex items-center gap-1 mb-1.5">
                  <ArrowDownRight size={10} className="text-primary" />
                  <span className="text-[10px] font-medium text-primary">Latest integration</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Focus on recent 2024 publications. The coding session has identified key APIs
                  that may relate to your research findings. Consider cross-referencing with the
                  implementation patterns found.
                </p>
              </div>
            </>
          )}

          {activeTab === 'prompt' && (
            <>
              <p className="text-[10px] font-semibold text-text-muted tracking-wide">SYSTEM PROMPT</p>
              <div className="bg-card rounded-lg p-3 shadow-sm border border-border/30">
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  You are a research assistant specialized in finding and summarizing academic
                  papers on AI conversation systems, dialogue management, and multi-session
                  architectures.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
