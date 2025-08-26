/**
 * 🚌 DLMM流动性管理系统 - 事件总线 (简化版)
 *
 * 系统内部事件通信核心组件
 */

import { injectable } from "tsyringe";

/**
 * 系统事件类型定义
 */
export interface SystemEvent {
  type: string;
  timestamp: number;
  data?: any;
  source?: string;
}

/**
 * 事件监听器类型
 */
export type EventListener = (...args: any[]) => void;

/**
 * 事件总线接口
 */
export interface IEventBus {
  emit(event: string, data?: any): boolean;
  on(event: string, listener: EventListener): this;
  off(event: string, listener: EventListener): this;
  once(event: string, listener: EventListener): this;
  removeAllListeners(event?: string): this;
  getEventNames(): string[];
  listenerCount(event: string): number;

  // 新增接口方法以符合系统定义
  publish<T>(eventType: string, data: T, source?: string): Promise<void>;
  subscribe(
    eventType: string,
    handler: (event: any) => Promise<void> | void,
  ): string;
  unsubscribe(subscriptionId: string): void;
  getEventHistory(eventType: string, timeframe?: any): Promise<any[]>;
}

/**
 * 事件总线实现类 (简化版)
 * 自己实现事件机制，避免继承复杂性
 */
@injectable()
export class EventBus implements IEventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private onceListeners: Map<string, EventListener[]> = new Map();
  private eventHistory: SystemEvent[] = [];
  private subscriptions: Map<string, { eventType: string; handler: Function }> =
    new Map();
  private subscriptionCounter = 0;
  private maxHistorySize = 1000;

  // 🔧 修复：事件防抖机制，避免频繁触发控制台警告
  private eventDebounceMap: Map<
    string,
    {
      timer: NodeJS.Timeout | null;
      lastData: any;
      count: number;
      lastEmit: number;
    }
  > = new Map();
  private readonly debounceEvents = [
    "strategy.smart-stop-loss.update",
    "pool-crawler.status.update",
  ];
  private readonly debounceDelay = 1000; // 1秒防抖

  constructor() {
    console.log("📡 [EventBus] 事件总线初始化完成");
  }

  /**
   * 发送事件
   */
  public emit(event: string, data?: any): boolean {
    const systemEvent: SystemEvent = {
      type: event,
      timestamp: Date.now(),
      data,
      source: "EventBus",
    };

    // 记录事件历史
    this.addToHistory(systemEvent);

    // 🔧 修复：对频繁事件进行防抖处理，减少控制台警告
    if (this.debounceEvents.includes(event)) {
      return this.emitWithDebounce(event, data, systemEvent);
    }

    console.log(`📡 [EventBus] 发布事件: ${event}`);

    return this.executeListeners(event, data);
  }

  /**
   * 监听事件
   */
  public on(event: string, listener: EventListener): this {
    console.log(`👂 [EventBus] 注册监听器: ${event}`);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);

    return this;
  }

  /**
   * 移除监听器
   */
  public off(event: string, listener: EventListener): this {
    console.log(`🔇 [EventBus] 移除监听器: ${event}`);

    const regularListeners = this.listeners.get(event);
    if (regularListeners) {
      const index = regularListeners.indexOf(listener);
      if (index !== -1) {
        regularListeners.splice(index, 1);
        if (regularListeners.length === 0) {
          this.listeners.delete(event);
        }
      }
    }

    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      const index = onceListeners.indexOf(listener);
      if (index !== -1) {
        onceListeners.splice(index, 1);
        if (onceListeners.length === 0) {
          this.onceListeners.delete(event);
        }
      }
    }

    return this;
  }

  /**
   * 一次性监听
   */
  public once(event: string, listener: EventListener): this {
    console.log(`👂 [EventBus] 注册一次性监听器: ${event}`);

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event)!.push(listener);

    return this;
  }

  /**
   * 移除所有监听器
   */
  public removeAllListeners(event?: string): this {
    if (event) {
      console.log(`🔇 [EventBus] 移除所有监听器: ${event}`);
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      console.log(`🔇 [EventBus] 移除所有监听器`);
      this.listeners.clear();
      this.onceListeners.clear();
    }
    return this;
  }

  /**
   * 获取事件名称列表
   */
  public getEventNames(): string[] {
    const eventNames = new Set<string>();
    for (const name of this.listeners.keys()) {
      eventNames.add(name);
    }
    for (const name of this.onceListeners.keys()) {
      eventNames.add(name);
    }
    return Array.from(eventNames);
  }

  /**
   * 获取监听器数量
   */
  public listenerCount(event: string): number {
    const regularCount = this.listeners.get(event)?.length || 0;
    const onceCount = this.onceListeners.get(event)?.length || 0;
    return regularCount + onceCount;
  }

  /**
   * 清空事件历史
   */
  public clearHistory(): void {
    this.eventHistory = [];
    console.log("🧹 [EventBus] 事件历史已清空");
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    totalEvents: number;
    eventTypes: string[];
    listenerCounts: Record<string, number>;
  } {
    const eventNames = this.getEventNames();
    const listenerCounts: Record<string, number> = {};

    eventNames.forEach((name) => {
      listenerCounts[name] = this.listenerCount(name);
    });

    return {
      totalEvents: this.eventHistory.length,
      eventTypes: [...new Set(this.eventHistory.map((e) => e.type))],
      listenerCounts,
    };
  }

  /**
   * 添加到事件历史
   */
  private addToHistory(event: SystemEvent): void {
    this.eventHistory.push(event);

    // 保持历史记录在限制范围内
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 销毁事件总线
   */
  public destroy(): void {
    this.removeAllListeners();
    this.clearHistory();
    console.log("💥 [EventBus] 事件总线已销毁");
  }

  /**
   * 发布事件 (新接口方法)
   */
  public async publish<T>(
    eventType: string,
    data: T,
    source?: string,
  ): Promise<void> {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data,
      source: source || "unknown",
    };

    this.addToHistory(event);
    this.emit(eventType, data);
  }

  /**
   * 订阅事件 (新接口方法)
   */
  public subscribe(
    eventType: string,
    handler: (event: any) => Promise<void> | void,
  ): string {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;

    // 包装处理器以添加错误处理
    const wrappedHandler = (data: any) => {
      try {
        const result = handler(data);
        // 如果是Promise，添加异步错误处理
        if (
          result &&
          typeof result === "object" &&
          result.constructor &&
          result.constructor.name === "Promise"
        ) {
          (result as Promise<void>).catch((error: any) => {
            console.error(
              `❌ [EventBus] 订阅处理器异步错误: ${eventType} (ID: ${subscriptionId})`,
              error,
            );
          });
        }
      } catch (error) {
        console.error(
          `❌ [EventBus] 订阅处理器同步错误: ${eventType} (ID: ${subscriptionId})`,
          error,
        );
      }
    };

    this.subscriptions.set(subscriptionId, {
      eventType,
      handler: wrappedHandler,
    });
    this.on(eventType, wrappedHandler);

    console.log(`👂 [EventBus] 订阅事件: ${eventType} (ID: ${subscriptionId})`);
    return subscriptionId;
  }

  /**
   * 取消订阅 (新接口方法)
   */
  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.off(subscription.eventType, subscription.handler as EventListener);
      this.subscriptions.delete(subscriptionId);
      console.log(`🔇 [EventBus] 取消订阅: ${subscriptionId}`);
    }
  }

  /**
   * 获取事件历史 (新接口方法)
   */
  public async getEventHistory(
    eventType: string,
    timeframe?: any,
  ): Promise<any[]> {
    return this.eventHistory
      .filter((event) => event.type === eventType)
      .slice(-100); // 返回最近100条
  }

  /**
   * 🔧 修复：带防抖的事件发射，避免频繁触发
   */
  private emitWithDebounce(
    event: string,
    data: any,
    systemEvent: SystemEvent,
  ): boolean {
    const now = Date.now();
    let debounceInfo = this.eventDebounceMap.get(event);

    if (!debounceInfo) {
      debounceInfo = {
        timer: null,
        lastData: null,
        count: 0,
        lastEmit: 0,
      };
      this.eventDebounceMap.set(event, debounceInfo);
    }

    debounceInfo.lastData = data;
    debounceInfo.count++;

    // 清除之前的定时器
    if (debounceInfo.timer) {
      clearTimeout(debounceInfo.timer);
    }

    // 如果距离上次发射超过防抖时间，立即发射
    if (now - debounceInfo.lastEmit > this.debounceDelay) {
      debounceInfo.lastEmit = now;
      const count = debounceInfo.count;
      debounceInfo.count = 0;

      console.log(`📡 [EventBus] 发布事件: ${event} (合并了${count}个事件)`);
      return this.executeListeners(event, data);
    }

    // 设置新的防抖定时器
    debounceInfo.timer = setTimeout(() => {
      debounceInfo.lastEmit = now;
      const count = debounceInfo.count;
      debounceInfo.count = 0;
      debounceInfo.timer = null;

      console.log(
        `📡 [EventBus] 发布事件: ${event} (防抖延迟，合并了${count}个事件)`,
      );
      this.executeListeners(event, debounceInfo.lastData);
    }, this.debounceDelay);

    return true; // 表示事件已被处理（虽然是延迟的）
  }

  /**
   * 🔧 修复：执行监听器的核心逻辑（从emit方法提取）
   */
  private executeListeners(event: string, data: any): boolean {
    let hasListeners = false;

    // 执行普通监听器
    const regularListeners = this.listeners.get(event);
    if (regularListeners && regularListeners.length > 0) {
      hasListeners = true;
      regularListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`❌ [EventBus] 监听器执行错误: ${event}`, error);
        }
      });
    }

    // 执行一次性监听器
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners && onceListeners.length > 0) {
      hasListeners = true;
      onceListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`❌ [EventBus] 一次性监听器执行错误: ${event}`, error);
        }
      });
      // 清空一次性监听器
      this.onceListeners.delete(event);
    }

    return hasListeners;
  }
}

// 常用的系统事件常量
export const EVENTS = {
  // 系统级事件
  SYSTEM_STARTUP: "system.startup",
  SYSTEM_SHUTDOWN: "system.shutdown",
  SYSTEM_ERROR: "system.error",

  // 配置事件
  CONFIG_LOADED: "config.loaded",
  CONFIG_UPDATED: "config.updated",

  // 连接事件
  CONNECTION_ESTABLISHED: "connection.established",
  CONNECTION_LOST: "connection.lost",

  // 钱包事件
  WALLET_CONNECTED: "wallet.connected",
  WALLET_DISCONNECTED: "wallet.disconnected",
  WALLET_BALANCE_UPDATED: "wallet.balance.updated",

  // 交易事件
  TRANSACTION_STARTED: "transaction.started",
  TRANSACTION_COMPLETED: "transaction.completed",
  TRANSACTION_FAILED: "transaction.failed",

  // 策略事件
  STRATEGY_STARTED: "strategy.started",
  STRATEGY_STOPPED: "strategy.stopped",
  STRATEGY_ERROR: "strategy.error",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
