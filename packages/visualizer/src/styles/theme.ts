// ─── Liquid Glass 设计令牌 ───

/** 全局样式常量，统一 Liquid Glass 视觉风格 */
export const theme = {
  // 面板
  panelBg: 'rgba(255, 255, 255, 0.08)',
  panelBorder: 'rgba(255, 255, 255, 0.15)',
  panelShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
  panelRadius: 16,
  panelBlur: 'blur(20px) saturate(180%)',

  // 输入框/按钮
  inputBg: 'rgba(255, 255, 255, 0.06)',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  buttonBg: 'rgba(126, 200, 227, 0.3)',
  buttonHoverBg: 'rgba(126, 200, 227, 0.5)',

  // Tab
  tabActiveBg: 'rgba(255, 255, 255, 0.12)',
  tabInactiveBg: 'transparent',
  tabRadius: 8,

  // 文字
  textPrimary: 'rgba(255, 255, 255, 0.85)',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',

  // 星空图
  canvasBg: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
  nodeGlow: (color: string) => `0 0 12px ${color}40, 0 0 4px ${color}80`,

  // 节点颜色
  colors: {
    blue: '#7EC8E3',
    purple: '#A78BFA',
    mint: '#34D399',
    archived: '#6B7280',
  },
} as const;
