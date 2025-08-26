/**
 * 🏗️ 策略相关类型定义
 * 统一策略类型，避免重复定义导致的类型冲突
 */

// 策略类型枚举 - 与接口保持一致
export enum StrategyType {
  SIMPLE_Y = "simple-y",
  DUAL_POSITION = "dual-position",
  PRICE_TRIGGER = "price-trigger",
  FORCE_STOP = "force-stop",
  CHAIN_POSITION = "chain-position",
}

// 策略状态枚举
export enum StrategyEngineState {
  CREATED = "created",
  INITIALIZING = "initializing",
  RUNNING = "running",
  PAUSED = "paused",
  STOPPING = "stopping",
  STOPPED = "stopped",
  ERROR = "error",
  FAILED = "failed",
}

// 扩展的策略配置接口
export interface ExtendedStrategyConfig {
  id: string;
  name: string;
  type: StrategyType;
  version: string;
  description: string;
  parameters: Record<string, any>;
  constraints: {
    maxPositions: number;
    maxValue: number;
    riskLimit: number;
    timeLimit?: number;
  };
  triggers: {
    priceChange?: number;
    timeInterval?: number;
    profitTarget?: number;
    stopLoss?: number;
  };
  recovery: {
    maxRetries: number;
    retryDelay: number;
    fallbackStrategy?: string;
  };
}

// 策略实例接口
export interface StrategyInstance {
  id: string;
  strategyId: string;
  state: StrategyEngineState;
  config: ExtendedStrategyConfig;
  createdAt: number;
  startedAt?: number;
  lastActivity: number;
  performance: {
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
    avgProfit: number;
    totalTrades: number;
  };
  positions: string[];
  metadata: Record<string, any>;
}

// 策略执行结果接口
export interface StrategyExecutionResult {
  success: boolean;
  instanceId: string;
  action: string;
  result?: any;
  error?: string;
  metrics: {
    executionTime: number;
    resourceUsage: number;
    impactScore: number;
  };
}

// 策略调度任务接口
export interface StrategyTask {
  id: string;
  instanceId: string;
  action: string;
  priority: number;
  scheduledAt: number;
  parameters: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

// 策略验证结果
export interface StrategyValidationResult {
  valid: boolean;
  errors: string[];
}

// 策略操作结果
export interface StrategyOperationResult {
  success: boolean;
  error?: string;
}

// ============ 简单Y头寸策略专用类型定义 ============

// 简单Y策略配置接口
export interface SimpleYStrategyConfig {
  // 基础配置
  poolAddress: string; // 池地址
  yAmount: number; // Y代币投入数量
  binRange: number; // bin范围 (1-69)

  // 止损配置
  stopLossBinOffset: number; // 止损bin偏移 (默认35)
  stopLossCount: number; // 止损重建次数 (默认1)

  // 超时配置
  outOfRangeTimeoutMinutes: number; // 出界超时分钟 (默认30)
  pauseAfterOutOfRange: boolean; // 出界后暂停 (默认true)

  // 系统配置
  maxRetryCount: number; // 最大重试次数 (默认3)
  slippageBps: number; // 滑点基点 (默认800)
}

// 简单Y策略运行时状态
export interface SimpleYStrategyState {
  // 基础信息
  instanceId: string;
  status: StrategyEngineState;
  config: SimpleYStrategyConfig;

  // 当前状态
  currentStage:
    | "NO_POSITION"
    | "Y_POSITION_ONLY"
    | "OUT_OF_RANGE"
    | "STOP_LOSS_TRIGGERED"
    | "CLEANUP";

  // 头寸信息
  currentPositionAddress: string | null;
  positionRange: [number, number] | null; // [下界bin, 上界bin]
  currentActiveBin: number | null;

  // 计数器和计时器
  remainingStopLossCount: number; // 剩余止损次数
  outOfRangeStartTime: number | null; // 出界开始时间
  stopLossStartTime: number | null; // 止损触发时间

  // 运行时数据
  lastMonitorTime: number;
  retryCount: number;

  // 历史记录
  operationHistory: SimpleYOperationRecord[];
  performanceMetrics: SimpleYPerformanceData;
}

// 简单Y策略操作记录
export interface SimpleYOperationRecord {
  timestamp: number;
  action:
    | "POSITION_CREATED"
    | "POSITION_CLOSED"
    | "SWAP_EXECUTED"
    | "STOP_LOSS_TRIGGERED"
    | "OUT_OF_RANGE_DETECTED"
    | "TIMEOUT_REACHED";
  details: {
    activeBin: number | null;
    positionAddress: string | null;
    amount?: number;
    reason?: string;
    success: boolean;
    error?: string;
  };
}

// 简单Y策略性能数据
export interface SimpleYPerformanceData {
  totalReturn: number; // 总收益率
  totalPositionsCreated: number; // 创建头寸总数
  totalPositionsClosed: number; // 关闭头寸总数
  totalSwapsExecuted: number; // 执行交换总数
  stopLossTriggered: number; // 止损触发次数
  outOfRangeEvents: number; // 出界事件次数
  averageHoldingTime: number; // 平均持仓时间（分钟）
  totalFeesEarned: number; // 总手续费收入
  totalSlippageLoss: number; // 总滑点损失
  successRate: number; // 操作成功率
}

// 简单Y策略执行结果
export interface SimpleYStrategyResult {
  success: boolean;
  message: string;
  nextStage?:
    | "NO_POSITION"
    | "Y_POSITION_ONLY"
    | "OUT_OF_RANGE"
    | "STOP_LOSS_TRIGGERED"
    | "CLEANUP";
  data?: any;
  error?: string;
  shouldContinue?: boolean;
  retryAfter?: number; // 重试延迟（毫秒）
}
