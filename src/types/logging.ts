/**
 * 日志系统类型定义
 * 统一日志级别、接口和配置类型
 */

// 日志级别枚举
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

// 追踪上下文接口
export interface ITraceContext {
  traceId: string;
  startTime: number;
  metadata?: Record<string, any>;
}

// 日志写入器接口
export interface ILogWriter {
  writeLog(
    category: string,
    level: LogLevel,
    message: string,
    traceId?: string,
  ): Promise<void>;
  writeErrorLog(
    category: string,
    message: string,
    error?: Error,
    traceId?: string,
  ): Promise<void>;
  flush(): Promise<void>;
}

// 策略日志器接口
export interface IStrategyLogger {
  logOperation(
    operation: string,
    details: any,
    traceId?: string,
  ): Promise<void>;
  logMonitoring(metric: string, value: any, traceId?: string): Promise<void>;
  logError(error: string, errorObj?: Error, traceId?: string): Promise<void>;
  cleanup(): Promise<void>;
}

// 日志条目接口 (新增)
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  traceId?: string | undefined;
}

// 主日志服务接口
export interface ILoggerService {
  // 系统日志
  logSystem(level: LogLevel, message: string, traceId?: string): Promise<void>;

  // 业务日志
  logBusinessOperation(
    operation: string,
    details: any,
    traceId?: string,
  ): Promise<void>;
  logBusinessMonitoring(
    metric: string,
    value: any,
    traceId?: string,
  ): Promise<void>;

  // 🔥 新增：便捷方法 - 业务操作 + 系统日志回显
  logBusinessOperationWithEcho(
    operation: string,
    details: any,
    systemMessage?: string,
    traceId?: string,
  ): Promise<void>;

  // 🔥 新增：策略专用便捷方法 - 策略实例日志 + 业务操作日志 + 系统日志
  logStrategyOperationWithEcho(
    instanceId: string,
    operation: string,
    details: any,
    systemMessage?: string,
    traceId?: string,
  ): Promise<void>;

  // 策略实例日志器创建
  createStrategyLogger(instanceId: string): IStrategyLogger;

  // 错误日志
  logError(
    category: string,
    error: string,
    errorObj?: Error,
    traceId?: string,
  ): Promise<void>;

  // 系统控制
  flush(): Promise<void>;
  shutdown(): Promise<void>;

  // 日志清理和统计
  clearAllLogs(): Promise<void>;
  getLogStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    categories: { [key: string]: { files: number; size: number } };
  }>;

  // 日志查询方法 (新增)
  getRecentLogs(limit?: number): Promise<LogEntry[]>;
  getErrorLogs(limit?: number): Promise<LogEntry[]>;
  getBusinessOperationLogs(limit?: number): Promise<LogEntry[]>;
  getBusinessMonitoringLogs(limit?: number): Promise<LogEntry[]>;
  getLogsByCategory(category: string, limit?: number): Promise<LogEntry[]>;
  getAvailableLogFiles(): Promise<string[]>;
  getMixedLogs(limit?: number): Promise<LogEntry[]>;
}

// 日志配置接口
export interface ILogConfig {
  // 全局设置
  globalLevel: LogLevel;
  enableTracing: boolean;

  // 文件设置
  maxFileSize: number; // 字节
  maxFiles: number; // 保留文件数

  // 分类级别设置
  categoryLevels: {
    system: LogLevel;
    business: LogLevel;
    strategies: LogLevel;
  };

  // 输出设置
  enableConsole: boolean;
  enableFile: boolean;

  // 格式设置
  timeFormat: string;
}

// 默认开发环境配置
export const DEFAULT_DEV_CONFIG: ILogConfig = {
  globalLevel: LogLevel.DEBUG,
  enableTracing: true,
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxFiles: 3,
  categoryLevels: {
    system: LogLevel.DEBUG,
    business: LogLevel.DEBUG,
    strategies: LogLevel.DEBUG,
  },
  enableConsole: true,
  enableFile: true,
  timeFormat: "MM/DD HH:mm:ss",
};

// 生产环境配置
export const PRODUCTION_CONFIG: ILogConfig = {
  globalLevel: LogLevel.INFO,
  enableTracing: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  categoryLevels: {
    system: LogLevel.INFO,
    business: LogLevel.INFO,
    strategies: LogLevel.WARN,
  },
  enableConsole: false,
  enableFile: true,
  timeFormat: "MM/DD HH:mm:ss",
};
