/** Stello Visualizer 版本号 */
export const VERSION = '0.1.0';

// 类型导出
export type {
  SessionData,
  SessionStatus,
  LayoutNode,
  LayoutConfig,
  ViewTransform,
  RenderConfig,
  StelloGraphProps,
} from './types';

// 布局算法（纯函数，可独立使用）
export { computeConstellationLayout } from './layout/constellation';

// 渲染器（可独立使用，不依赖 React）
export { renderFrame } from './renderer/canvas-renderer';

// 交互处理器
export type { InteractionCallbacks } from './interaction/interaction-handler';
export { InteractionHandler } from './interaction/interaction-handler';

// React 组件
export { StelloGraph } from './components/StelloGraph';
export { Tooltip } from './components/Tooltip';
export type { TooltipProps } from './components/Tooltip';
