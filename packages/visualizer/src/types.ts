// ─── Stello Visualizer 类型定义 ───

/** Session 状态 */
export type SessionStatus = 'active' | 'archived';

/**
 * 可视化输入数据
 *
 * 与 @stello-ai/core 的 SessionMeta 结构兼容（鸭子类型）。
 * 只保留可视化所需的最小字段子集，不引入运行时依赖。
 */
export interface SessionData {
  readonly id: string;
  parentId: string | null;
  children: string[];
  refs: string[];
  label: string;
  index: number;
  status: SessionStatus;
  depth: number;
  turnCount: number;
  lastActiveAt: string;
}

/**
 * 布局计算结果——单个节点在画布上的位置和视觉属性
 */
export interface LayoutNode {
  /** Session ID */
  readonly id: string;
  /** 画布 X 坐标 */
  x: number;
  /** 画布 Y 坐标 */
  y: number;
  /** 节点半径（像素） */
  size: number;
  /** 亮度 0-1（越近越亮） */
  brightness: number;
  /** 填充颜色（CSS 颜色字符串） */
  color: string;
  /** 透明度 0-1（归档节点低透明度） */
  opacity: number;
  /** 父节点 ID */
  parentId: string | null;
  /** 跨分支引用 ID 列表 */
  refs: string[];
  /** 显示标签 */
  label: string;
}

/** 布局配置 */
export interface LayoutConfig {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** 每层环的间距（像素，默认 100） */
  ringSpacing?: number;
  /** turnCount 映射到 size 的最小半径（默认 4） */
  minNodeSize?: number;
  /** turnCount 映射到 size 的最大半径（默认 24） */
  maxNodeSize?: number;
  /** 归档节点透明度（默认 0.3） */
  archivedOpacity?: number;
  /** 默认节点颜色（默认 '#7EC8E3'） */
  defaultColor?: string;
  /** 节点颜色映射函数——开发者自定义 */
  colorFn?: (session: SessionData) => string;
}

/** 画布视图变换状态 */
export interface ViewTransform {
  /** X 轴偏移 */
  offsetX: number;
  /** Y 轴偏移 */
  offsetY: number;
  /** 缩放倍率 */
  scale: number;
}

/** 渲染配置 */
export interface RenderConfig {
  /** 父子连线颜色 */
  parentLineColor?: string;
  /** 引用虚线颜色 */
  refLineColor?: string;
  /** 连线宽度 */
  lineWidth?: number;
  /** 虚线样式 */
  refLineDash?: number[];
  /** 是否显示标签 */
  showLabels?: boolean;
  /** 标签字体 */
  labelFont?: string;
  /** 标签颜色 */
  labelColor?: string;
  /** 背景色 */
  backgroundColor?: string;
}

/**
 * StelloGraph 组件 Props
 */
export interface StelloGraphProps {
  /** Session 数据列表 */
  sessions: SessionData[];
  /** 节点点击回调 */
  onSessionClick?: (sessionId: string) => void;
  /** 记忆摘要映射（用于 tooltip 展示） */
  memories?: Map<string, string>;
  /** 布局配置 */
  layoutConfig?: Partial<LayoutConfig>;
  /** 渲染配置 */
  renderConfig?: Partial<RenderConfig>;
  /** 自定义 CSS 类名 */
  className?: string;
}
