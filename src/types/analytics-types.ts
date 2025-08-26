/**
 * 头寸分析服务类型定义
 * 统计计算业务层服务相关的接口和类型
 */

// ================== 基础数据结构 ==================

/**
 * 价格记录
 */
export interface PriceRecord {
  timestamp: number;
  price: number;
  activeBinId: number;
}

/**
 * 价格趋势分析结果
 */
export interface PriceTrendAnalysis {
  timeframe: number; // 分析时间窗口（分钟）
  priceChange: number; // 价格变化数量
  priceChangePercent: number; // 价格变化百分比
  isThresholdTriggered: boolean; // 是否触发阈值
  startPrice: number; // 起始价格
  endPrice: number; // 结束价格
  startTime: number; // 起始时间
  endTime: number; // 结束时间
}

/**
 * 收益记录
 */
export interface YieldRecord {
  timestamp: number;
  tokenXAmount: string;
  tokenYAmount: string;
  totalYieldInY: string; // 按当前价格换算的Y代币总量
  yieldUsdValue: number;
  currentPrice: number; // 记录时的价格
}

/**
 * 收益提取记录
 */
export interface YieldExtraction {
  timestamp: number;
  extractedAmount: string; // 提取的Y代币数量
  transactionSignature: string;
  gasUsed: number;
  priceAtExtraction: number; // 提取时的价格
}

/**
 * 收益率预测
 */
export interface YieldProjection {
  hourlyRate: number; // 小时收益率 (%)
  dailyRate: number; // 日收益率 (%)
  timeframe: number; // 计算基准时间窗口（分钟）
  confidence: number; // 预测置信度 (0-1)
  basedOnSamples: number; // 基于的样本数量
}

/**
 * 时间段收益记录（用于手续费收益率计算）
 */
export interface TimeframeYieldRecord {
  timestamp: number;
  timeframe: number; // 时间窗口长度（分钟）
  yieldAmount: string; // 该时间段内的收益数量
  yieldRate: number; // 该时间段的收益率 (%)
  annualizedRate: number; // 年化收益率 (%)
}

/**
 * 两种收益率计算结果
 */
export interface DualYieldRates {
  // 1. 真实盈亏百分比（总体投资表现）
  totalReturnRate: number; // 真实盈亏百分比 (%)

  // 2. 手续费收益效率（日化收益率）
  feeYieldEfficiency: {
    last5Minutes: number; // 过去5分钟日化收益率 (% × 12 × 24)
    last15Minutes: number; // 过去15分钟日化收益率 (% × 4 × 24)
    lastHour: number; // 过去1小时日化收益率 (% × 24)
  };

  // 历史收益快照（仅存储1小时内）
  recentYieldSnapshots: TimeframeYieldRecord[];
}

/**
 * 收益统计汇总
 */
export interface YieldStatistics {
  totalExtractedYield: string; // 累计提取收益
  currentPendingYield: string; // 当前待提取收益
  totalYieldCount: number; // 总收益次数
  avgYieldPerPeriod: number; // 平均每期收益
  lastExtractionTime: number; // 最后提取时间
  nextProjectedExtraction: number; // 预计下次提取时间
  yieldProjection: YieldProjection; // 收益率预测
  recentYields: YieldRecord[]; // 最近的收益记录

  // 新增：两种收益率计算
  dualYieldRates: DualYieldRates; // 双重收益率分析
}

/**
 * 头寸亏损分析
 */
export interface PositionLoss {
  positionAddress: string;
  currentTokenX: string;
  currentTokenY: string;
  currentValueInY: string; // 当前头寸总价值（Y代币计算）
  initialInvestment: string; // 初始投入Y代币数量
  lossAmount: string; // 亏损数量
  lossPercentage: number; // 亏损百分比
  timestamp: number;
  priceAtCalculation: number; // 计算时的价格
}

/**
 * 真实盈亏报告
 */
export interface RealPnL {
  totalExtractedYield: string; // 累计提取收益
  currentPositionValue: string; // 头寸当前价值
  initialInvestment: string; // 初始投入
  realPnLAmount: string; // 真实盈亏数量
  realPnLPercentage: number; // 真实盈亏百分比
  timestamp: number;
  breakdown: {
    extractedYieldValue: number; // 提取收益价值
    positionValueChange: number; // 头寸价值变化
    totalReturn: number; // 总回报
  };
}

// ================== 配置接口 ==================

/**
 * 价格下跌阈值配置
 */
export interface PriceDropThreshold {
  timeframe: number; // 时间窗口（分钟）
  threshold: number; // 阈值百分比
  enabled: boolean; // 是否启用
}

/**
 * 分析服务配置
 */
export interface AnalyticsConfig {
  // 价格监控配置
  priceMonitorInterval: number; // 价格监控间隔（毫秒）
  trendAnalysisTimeframes: number[]; // 趋势分析时间窗口数组
  priceDropThresholds: PriceDropThreshold[]; // 价格下跌阈值配置

  // 收益计算配置
  yieldCalculationInterval: number; // 收益计算间隔（毫秒）
  yieldExtractionThreshold: string; // 收益提取阈值
  yieldExtractionTimeLock?: number; // 收益提取时间锁（分钟），默认1分钟
  projectionTimeframe: number; // 收益率预测窗口（分钟）

  // 数据管理配置
  maxHistoryDays: number; // 最大历史数据天数
  cleanupInterval: number; // 数据清理间隔（毫秒）

  // 重试配置
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟（毫秒）

  // 日志配置
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
  logPerformance: boolean; // 是否记录性能指标
}

/**
 * 头寸监控设置参数
 */
export interface PositionSetupParams {
  poolAddress: string; // 池子地址
  positionAddresses: string[]; // 头寸地址数组
  initialInvestmentAmount: string; // 初始投入Y代币数量

  // 可选配置参数
  config?: Partial<AnalyticsConfig>;

  // 🔧 新增：可选的代币精度信息（来自策略实例缓存）
  tokenPrecision?: {
    tokenXDecimals: number;
    tokenYDecimals: number;
    tokenXMint: string;
    tokenYMint: string;
  };
}

// ================== 综合报告接口 ==================

/**
 * 完整分析报告
 */
export interface AnalyticsReport {
  // 基础信息
  reportTimestamp: number;
  poolAddress: string;
  positionAddresses: string[];
  monitoringDuration: number; // 监控时长（毫秒）

  // 价格分析
  currentPrice: number;
  priceHistory: PriceRecord[];
  priceTrendAnalysis: PriceTrendAnalysis[];

  // 收益分析
  yieldStatistics: YieldStatistics;

  // 亏损分析
  positionLossAnalysis: PositionLoss[];

  // 盈亏报告
  realPnLReport: RealPnL;

  // 性能指标
  performanceMetrics: {
    totalApiCalls: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate?: number; // 🚀 新增：缓存命中率
    lastUpdate: number;
  };

  // 警报状态
  alerts: AnalyticsAlert[];
}

/**
 * 分析警报
 */
export interface AnalyticsAlert {
  id: string;
  type: "PRICE_DROP" | "YIELD_READY" | "LOSS_THRESHOLD" | "ERROR";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  timestamp: number;
  data?: any;
  acknowledged: boolean;
}

// ================== 服务接口 ==================

/**
 * 头寸分析服务接口
 */
export interface IPositionAnalyticsService {
  readonly name: string;
  readonly version: string;

  // 生命周期方法
  initialize(config: AnalyticsConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // 监控设置
  setupPositionMonitoring(params: PositionSetupParams): Promise<void>;
  stopMonitoring(): Promise<void>;

  // 数据获取方法
  getPriceTrendAnalysis(timeframes?: number[]): Promise<PriceTrendAnalysis[]>;
  getYieldStatistics(): Promise<YieldStatistics>;
  getPositionLossAnalysis(): Promise<PositionLoss[]>;
  getRealPnLReport(): Promise<RealPnL>;
  getCompleteAnalyticsReport(): Promise<AnalyticsReport>;

  // 实时查询方法
  getCurrentPrice(): Promise<number>;
  getPendingYield(): Promise<string>;
  isExtractionReady(): Promise<boolean>;

  // 健康状态
  healthCheck(): Promise<{
    status: "healthy" | "warning" | "error";
    message: string;
    timestamp: number;
    details?: any;
  }>;
}

// ================== 内部模块接口 ==================

// ================== 旧版内部模块接口已删除 ==================
// 以下接口已被新架构替代：
// - IPriceMonitor -> UnifiedDataProvider
// - IYieldCalculator -> YieldAnalyzer + YieldOperator
// - ILossAnalyzer -> UnifiedDataProvider
// - IPnLCalculator -> UnifiedDataProvider

// ================== 错误类型 ==================

/**
 * 分析服务错误类型
 */
export class AnalyticsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "AnalyticsServiceError";
  }
}

/**
 * 数据获取错误
 */
export class DataFetchError extends AnalyticsServiceError {
  constructor(source: string, details?: any) {
    super(`Failed to fetch data from ${source}`, "DATA_FETCH_ERROR", details);
  }
}

/**
 * 计算错误
 */
export class CalculationError extends AnalyticsServiceError {
  constructor(operation: string, details?: any) {
    super(`Calculation error in ${operation}`, "CALCULATION_ERROR", details);
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends AnalyticsServiceError {
  constructor(parameter: string, details?: any) {
    super(
      `Invalid configuration for ${parameter}`,
      "CONFIGURATION_ERROR",
      details,
    );
  }
}
