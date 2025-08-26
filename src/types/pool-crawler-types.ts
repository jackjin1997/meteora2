/**
 * 池爬虫相关类型定义
 * 基于 solmeteor.ai 网站的数据结构设计
 */

// ================== 池数据结构 ==================

/**
 * 原始池数据（从solmeteor.ai抓取的数据）
 */
export interface RawPoolData {
  rank: number; // 排名
  poolAddress: string; // 池地址
  tokenPair: string; // 代币对 (如 "BONK-SOL")
  meteorScore: number; // Meteor评分
  liquidity: number; // 流动性/TVL
  age: string; // 池年龄 (如 "2 mo", "13 hrs")
  fdv: number; // 完全稀释价值
  size: number; // 规模
  in: number; // 进入
  out: number; // 退出
  binStep: number; // Bin步长 (DLMM池的重要参数)

  // APR数据 (不同时间段)
  apr: {
    "5m": number;
    "1h": number;
    "6h": number;
    "24h": number;
    "7d": number;
  };

  // 价格变化数据
  priceChange: {
    "5m": number;
    "1h": number;
    "6h": number;
    "24h": number;
    "7d": number;
  };

  // 费用数据
  fees: {
    "5m": number;
    "1h": number;
    "6h": number;
    "24h": number;
    "7d": number;
  };

  // 交易量数据
  volume: {
    "5m": number;
    "1h": number;
    "6h": number;
    "24h": number;
    "7d": number;
  };

  // 元数据
  scrapedAt: number; // 抓取时间戳
  url?: string; // 原始URL
}

/**
 * 处理后的池数据
 */
export interface ProcessedPoolData extends RawPoolData {
  id: string; // 唯一标识符
  tokens: {
    tokenA: string; // 代币A符号
    tokenB: string; // 代币B符号
  };
  ageInHours: number; // 池年龄（小时）
  isQualified: boolean; // 是否符合筛选条件
  matchedFilters: string[]; // 匹配的筛选条件
  score: number; // 综合评分
}

// ================== 筛选条件 ==================

/**
 * 数值范围筛选
 */
export interface NumericFilter {
  enabled: boolean;
  min?: number;
  max?: number;
}

/**
 * 池筛选条件配置
 */
export interface PoolFilterConfig {
  // 基础数值筛选
  meteorScore: NumericFilter; // Meteor评分筛选
  liquidity: NumericFilter; // 流动性筛选
  fdv: NumericFilter; // FDV筛选
  ageInHours: NumericFilter; // 池年龄筛选（小时）

  // APR筛选
  apr: {
    "5m": NumericFilter;
    "1h": NumericFilter;
    "6h": NumericFilter;
    "24h": NumericFilter;
    "7d": NumericFilter;
  };

  // 价格变化筛选
  priceChange: {
    "5m": NumericFilter;
    "1h": NumericFilter;
    "6h": NumericFilter;
    "24h": NumericFilter;
    "7d": NumericFilter;
  };

  // 费用筛选
  fees: {
    "5m": NumericFilter;
    "1h": NumericFilter;
    "6h": NumericFilter;
    "24h": NumericFilter;
    "7d": NumericFilter;
  };

  // 交易量筛选
  volume: {
    "5m": NumericFilter;
    "1h": NumericFilter;
    "6h": NumericFilter;
    "24h": NumericFilter;
    "7d": NumericFilter;
  };

  // 代币筛选
  tokenWhitelist: string[]; // 代币白名单
  tokenBlacklist: string[]; // 代币黑名单

  // 排名筛选已移除 - 不再作为筛选条件
}

// ================== 爬虫配置 ==================

/**
 * 爬虫运行配置
 */
export interface CrawlerConfig {
  enabled: boolean; // 是否启用爬虫
  intervalMinutes: number; // 爬取间隔（分钟）
  maxPages: number; // 最大抓取页数
  requestDelay: number; // 请求延迟（毫秒）
  timeout: number; // 请求超时（毫秒）
  retryCount: number; // 重试次数
  userAgent: string; // 用户代理
  isRunning?: boolean; // 爬虫是否处于运行状态（可选）
}

/**
 * 爬虫状态
 */
export interface CrawlerStatus {
  isRunning: boolean; // 是否正在运行
  lastCrawlTime: number | null; // 上次爬取时间
  nextCrawlTime: number | null; // 下次爬取时间
  poolsDiscovered: number; // 已发现池数量
  qualifiedPools: number; // 合格池数量
  errors: CrawlerError[]; // 错误列表
  status: "stopped" | "running" | "paused" | "error";
}

/**
 * 爬虫错误
 */
export interface CrawlerError {
  timestamp: number;
  type: "network" | "parsing" | "validation" | "unknown";
  message: string;
  details?: any;
}

// ================== 合格池管理 ==================

/**
 * 合格池记录
 */
export interface QualifiedPoolRecord {
  id: string; // 唯一标识符
  poolData: ProcessedPoolData; // 池数据
  discoveredAt: number; // 发现时间
  notified: boolean; // 是否已通知
  rating: number; // 用户评分（1-5）
  notes: string; // 用户备注
  status: "new" | "reviewed" | "ignored" | "favorited";
}

/**
 * 合格池存储配置
 */
export interface QualifiedPoolsStorage {
  maxRecords: number; // 最大记录数
  autoCleanupDays: number; // 自动清理天数
  backupEnabled: boolean; // 是否启用备份
}

// ================== Socket.IO事件 ==================

/**
 * Socket.IO事件数据结构
 */
export interface PoolCrawlerSocketEvents {
  // 状态更新
  "pool-crawler.status.update": CrawlerStatus;

  // 池发现通知
  "pool-crawler.pools.discovered": {
    pools: ProcessedPoolData[];
    total: number;
    timestamp: number;
  };

  // 合格池通知
  "pool-crawler.pools.qualified": {
    pools: QualifiedPoolRecord[];
    timestamp: number;
  };

  // 过滤器更新
  "pool-crawler.filters.updated": {
    filters: PoolFilterConfig;
    timestamp: number;
  };

  // 错误通知
  "pool-crawler.error": CrawlerError;
}

// ================== API接口 ==================

/**
 * 爬虫控制API请求
 */
export interface CrawlerControlRequest {
  action: "start" | "stop" | "pause" | "resume";
  config?: Partial<CrawlerConfig>;
}

/**
 * 过滤器更新API请求
 */
export interface FilterUpdateRequest {
  filters: Partial<PoolFilterConfig>;
}

/**
 * 合格池操作API请求
 */
export interface QualifiedPoolActionRequest {
  poolId: string;
  action: "rate" | "note" | "status";
  rating?: number;
  notes?: string;
  status?: QualifiedPoolRecord["status"];
}

// ================== 服务接口 ==================

/**
 * 池爬虫服务接口
 */
export interface IPoolCrawlerService {
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;

  // 配置管理
  updateConfig(config: Partial<CrawlerConfig>): Promise<void>;
  getConfig(): CrawlerConfig;

  // 筛选器管理
  updateFilters(filters: Partial<PoolFilterConfig>): Promise<void>;
  getFilters(): PoolFilterConfig;

  // 数据获取
  getDiscoveredPools(): ProcessedPoolData[];
  getQualifiedPools(): QualifiedPoolRecord[];
  getStatus(): CrawlerStatus;

  // 手动操作
  crawlNow(): Promise<void>;
  clearData(): Promise<void>;
}

/**
 * 数据解析器接口
 */
export interface IPoolDataParser {
  parsePoolData(html: string): Promise<RawPoolData[]>;
  validatePoolData(data: RawPoolData): boolean;
}

/**
 * 筛选引擎接口
 */
export interface IPoolFilterEngine {
  applyFilters(
    pools: RawPoolData[],
    filters: PoolFilterConfig,
  ): ProcessedPoolData[];
  calculateScore(pool: RawPoolData): number;
}

/**
 * 合格池存储接口
 */
export interface IQualifiedPoolsManager {
  save(pools: QualifiedPoolRecord[]): Promise<void>;
  load(): Promise<QualifiedPoolRecord[]>;
  add(pool: QualifiedPoolRecord): Promise<void>;
  update(poolId: string, updates: Partial<QualifiedPoolRecord>): Promise<void>;
  remove(poolId: string): Promise<void>;
  cleanup(): Promise<void>;
}

// ================== 推送状态管理 ==================

/**
 * 推送记录
 */
export interface PushRecord {
  poolAddress: string; // 池地址
  pushedAt: number; // 推送时间戳
  crawlerRound: number; // 爬虫轮次
  rank: number; // 池子排名
  apr24h: number; // 24小时APR
  volume24h: number; // 24小时交易量
  liquidity: number; // 流动性
  meteorScore: number; // Meteor评分
}

/**
 * 推送历史数据
 */
export interface PushHistoryData {
  records: PushRecord[];
  metadata: {
    totalPushes: number; // 总推送次数
    lastCleanup: number; // 上次清理时间
    version: string; // 数据版本
  };
}

/**
 * 推送存储配置
 */
export interface PushStorageConfig {
  retentionHours: number; // 数据保留时间（小时）
  cleanupInterval: number; // 清理间隔（毫秒）
  maxRecords: number; // 最大记录数
  enableBackup: boolean; // 是否启用备份
  backupInterval: number; // 备份间隔（小时）
}

/**
 * 推送状态存储管理器接口
 */
export interface IPoolPushStorageManager {
  /**
   * 检查池子是否在指定时间内已推送
   */
  hasBeenPushed(poolAddress: string): Promise<boolean>;

  /**
   * 记录推送状态
   */
  recordPush(poolAddress: string, poolData: ProcessedPoolData): Promise<void>;

  /**
   * 获取推送历史
   */
  getPushHistory(poolAddress?: string): Promise<PushRecord[]>;

  /**
   * 清理过期记录
   */
  cleanupExpiredRecords(): Promise<number>;

  /**
   * 获取推送统计
   */
  getPushStats(): Promise<{
    totalRecords: number;
    pushedToday: number;
    uniquePools: number;
    avgPushInterval: number;
  }>;

  /**
   * 重置推送状态
   */
  resetPushHistory(): Promise<void>;
}
