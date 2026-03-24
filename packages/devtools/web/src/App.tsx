import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Sparkles, MessageSquare, Search, Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Topology } from '@/pages/Topology'
import { Conversation } from '@/pages/Conversation'
import { Inspector } from '@/pages/Inspector'
import { Events } from '@/pages/Events'
import { SettingsPage } from '@/pages/Settings'

/** 侧边栏导航项 */
const navItems = [
  { to: '/topology', icon: Sparkles, label: 'Map' },
  { to: '/conversation', icon: MessageSquare, label: 'Chat' },
  { to: '/inspector', icon: Search, label: 'Inspect' },
  { to: '/events', icon: Activity, label: 'Events' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const

/** 侧边栏导航按钮 */
function NavItem({ to, icon: Icon, label }: (typeof navItems)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-[10px] transition-colors',
          isActive
            ? 'bg-primary-light text-primary'
            : 'text-text-muted hover:bg-muted',
        )
      }
    >
      <Icon size={20} />
      <span className="text-[9px] font-medium">{label}</span>
    </NavLink>
  )
}

/** 主应用布局 */
export function App() {
  return (
    <div className="flex h-screen w-screen">
      {/* 侧边栏 */}
      <nav className="flex flex-col items-center w-16 bg-card border-r border-border py-4 gap-2 shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-[10px] mb-3">
          <span className="text-white text-lg font-bold">S</span>
        </div>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/topology" replace />} />
          <Route path="/topology" element={<Topology />} />
          <Route path="/conversation" element={<Conversation />} />
          <Route path="/inspector" element={<Inspector />} />
          <Route path="/events" element={<Events />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
