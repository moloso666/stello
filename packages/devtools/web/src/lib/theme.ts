import { useState, useCallback, useEffect } from 'react'

export type Theme = 'light' | 'dark'

/** 主题管理 hook */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('stello-devtools-theme')
    return (saved === 'light' || saved === 'dark') ? saved : 'light'
  })

  /** 应用主题到 DOM */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  /** 切换并持久化 */
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('stello-devtools-theme', t)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
