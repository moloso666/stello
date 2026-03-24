import { useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Sparkles, MessageSquare, Search, Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectWs } from '@/lib/ws'
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
          'group flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-[10px]',
          'transition-all duration-200 ease-out',
          isActive
            ? 'bg-primary-light text-primary scale-105 shadow-sm'
            : 'text-text-muted hover:bg-muted hover:text-text-secondary hover:scale-105',
        )
      }
    >
      <Icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
      <span className="text-[9px] font-medium transition-colors duration-200">{label}</span>
    </NavLink>
  )
}

/** 主应用布局 */
export function App() {
  const location = useLocation()

  /* 启动 WS 连接 */
  useEffect(() => { connectWs() }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 侧边栏 */}
      <nav className="flex flex-col items-center w-16 bg-card border-r border-border py-4 gap-2 shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-[10px] mb-3 shadow-md transition-transform duration-200 hover:scale-110 cursor-pointer">
          <span className="text-white text-lg font-bold">S</span>
        </div>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* 主内容区——用 key 触发页面切换动画 */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <div key={location.pathname} className="h-full page-enter">
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/topology" replace />} />
            <Route path="/topology" element={<Topology />} />
            <Route path="/conversation" element={<Conversation />} />
            <Route path="/inspector" element={<Inspector />} />
            <Route path="/events" element={<Events />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
