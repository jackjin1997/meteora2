/**
 * 🏗️ DLMM流动性管理系统 - 依赖注入容器 (修复版)
 *
 * 基于tsyringe的模块化依赖注入容器
 * 移除数据库、Redis缓存、云端部署功能
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { TYPES } from "../types/interfaces";

// 导入基础设施服务
import { EventBus } from "../infrastructure/EventBus";
import { LoggerService } from "../infrastructure/logging/LoggerService";
import { createLoggerFromConfig } from "../infrastructure/logging/index";
import { DEFAULT_DEV_CONFIG } from "../types/logging";

// 导入内部服务
import { ConfigService } from "../services/internal/ConfigService";
import { StateService } from "../services/internal/StateService";
import { CacheService } from "../services/internal/CacheService";

// 导入区块链服务
import { SolanaWeb3Service } from "../services/blockchain/SolanaWeb3Service";
import { MultiRPCService } from "../services/blockchain/MultiRPCService";
import { WalletService } from "../services/blockchain/WalletService";
import { GasService } from "../services/blockchain/GasService";

// 导入外部服务
import { JupiterService } from "../services/external/JupiterService";
import { JupiterServiceV7 } from "../services/external/JupiterServiceV7";
import { MeteoraService } from "../services/external/MeteoraService";
import { HeliusService } from "../services/external/HeliusService";

// 导入策略服务 - 新架构
import { StrategyManager } from "../services/strategy/StrategyManager";
import { StrategyRegistry } from "../services/strategy/StrategyRegistry";
import { StrategyScheduler } from "../services/strategy/StrategyScheduler";
import { StrategyStorage } from "../services/strategy/storage/StrategyStorage";
import { SimpleYExecutor } from "../services/strategy/executors/SimpleYExecutor";
import { ChainPositionExecutor } from "../services/strategy/executors/ChainPositionExecutor";

// 导入SimpleY模块服务
import {
  SimpleYPositionService,
  SimpleYMonitoringService,
  SimpleYRiskService,
  SimpleYUtilityService,
} from "../services/strategy/executors/simple-y-modules";

// 旧架构已移除

// 导入业务服务
import { PositionManager } from "../services/business/PositionManager";
import { XPositionManager } from "../services/business/XPositionManager";
import { YPositionManager } from "../services/business/YPositionManager";
import { PositionAnalyticsService } from "../services/business/PositionAnalyticsService";
// 旧版分析服务已删除，使用新架构
import { PositionInfoService } from "../services/business/PositionInfoService";
import { PositionFeeHarvester } from "../services/business/PositionFeeHarvester";
import { ChainPositionManager } from "../services/business/ChainPositionManager";
import { LiquidityOperationService } from "../services/business/LiquidityOperationService";

// 导入新架构分析服务组件
import { UnifiedDataProvider } from "../services/business/analytics/UnifiedDataProvider";
import { YieldAnalyzer } from "../services/business/analytics/YieldAnalyzer";
import { YieldOperator } from "../services/business/analytics/YieldOperator";
import { AccumulatedYieldManager } from "../services/business/analytics/AccumulatedYieldManager";

// 导入重试管理器
import { SynchronousRetryManager } from "../services/modules/SynchronousRetryManager";

// 导入实例感知服务工厂
import { InstanceAwareServiceFactory } from "../services/business/InstanceAwareServiceFactory";

// 导入健康检查服务
import { StrategyHealthChecker } from "../services/strategy/StrategyHealthChecker";

// 导入池爬虫服务 - 暂时注释，待实现
// import { PoolCrawlerService } from '../services/crawler/PoolCrawlerService';
// import { PuppeteerWebCrawlerService } from '../services/crawler/PuppeteerWebCrawlerService';
// import { PoolDataParser } from '../services/crawler/PoolDataParser';
// import { PoolFilterEngine } from '../services/crawler/PoolFilterEngine';
// import { TokenFilterManager } from '../services/crawler/TokenFilterManager';
// import { QualifiedPoolsManager } from '../services/crawler/QualifiedPoolsManager';
// import { PoolPushStorageManager } from '../services/crawler/PoolPushStorageManager';

/**
 * 依赖注入容器配置类 (修复版)
 * 专注于本地部署，移除复杂依赖
 */
export class DIContainer {
  private static _instance: DIContainer;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DIContainer {
    if (!DIContainer._instance) {
      DIContainer._instance = new DIContainer();
    }
    return DIContainer._instance;
  }

  /**
   * 初始化依赖注入容器
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log("🔧 初始化DLMM依赖注入容器 (修复版)...");

    try {
      // 1. 基础设施层
      this.registerInfrastructureServices();

      // 2. 服务层
      this.registerServiceLayer();

      this.isInitialized = true;
      console.log("✅ DLMM依赖注入容器初始化完成");
    } catch (error) {
      console.error("❌ 依赖注入容器初始化失败:", error);
      throw error;
    }
  }

  /**
   * 注册基础设施层服务
   */
  private registerInfrastructureServices(): void {
    console.log("📦 注册基础设施层服务...");

    // 事件总线
    container.registerSingleton(TYPES.EventBus, EventBus);

    // 日志服务 (从配置文件加载三层分离架构配置)
    const loggerService = createLoggerFromConfig();
    container.registerInstance(TYPES.LoggerService, loggerService);
    // 同时注册为字符串token，供池爬虫服务使用
    container.registerInstance("LoggerService", loggerService);

    // 配置服务
    container.registerSingleton(TYPES.ConfigService, ConfigService);

    // 状态服务 (内存存储，替代数据库)
    container.registerSingleton(TYPES.StateService, StateService);

    // 缓存服务 (内存缓存)
    container.registerSingleton(TYPES.CacheService, CacheService);

    console.log("✅ 基础设施层服务注册完成");
  }

  /**
   * 注册服务层
   */
  /**
   * 注册服务层 (优化版 - 按依赖顺序注册)
   */
  private registerServiceLayer(): void {
    console.log("⚙️ 按依赖层级注册服务层...");

    // 第1层：基础区块链服务（无外部依赖）
    console.log("📦 注册第1层：基础区块链服务...");
    container.registerSingleton(TYPES.MultiRPCService, MultiRPCService);

    // 第2层：依赖基础服务的区块链服务
    console.log("📦 注册第2层：核心区块链服务...");
    container.registerSingleton(TYPES.SolanaWeb3Service, SolanaWeb3Service);
    container.registerSingleton(TYPES.GasService, GasService);

    // 第3层：依赖区块链服务的高级服务
    console.log("📦 注册第3层：高级区块链服务...");
    container.registerSingleton(TYPES.WalletService, WalletService);

    // 第4层：外部服务（独立初始化，降级友好）
    console.log("📦 注册第4层：外部服务...");
    this.registerExternalServicesWithFallback();

    // 第5层：业务服务（依赖区块链服务）
    console.log("📦 注册第5层：业务服务...");
    container.registerSingleton(TYPES.PositionInfoService, PositionInfoService);
    container.registerSingleton(TYPES.PositionManager, PositionManager);
    // 🔧 修复：同时注册字符串token，供ChainPositionManager使用
    container.register("PositionManager", { useToken: TYPES.PositionManager });
    container.registerSingleton(TYPES.XPositionManager, XPositionManager);
    container.registerSingleton(TYPES.YPositionManager, YPositionManager);
    container.registerSingleton(
      TYPES.PositionFeeHarvester,
      PositionFeeHarvester
    );

    // 旧版分析服务组件已删除，使用新架构组件替代

    // 新架构分析服务组件（PositionAnalyticsService v3.0.0的依赖）
    container.registerSingleton(TYPES.UnifiedDataProvider, UnifiedDataProvider);
    container.registerSingleton(
      AccumulatedYieldManager,
      AccumulatedYieldManager
    ); // 累积收益管理器
    container.registerSingleton(TYPES.YieldAnalyzer, YieldAnalyzer);
    container.registerSingleton(TYPES.YieldOperator, YieldOperator);

    // 🏭 实例感知服务工厂（用于创建实例隔离的分析服务）
    container.registerSingleton(
      InstanceAwareServiceFactory,
      InstanceAwareServiceFactory
    );

    // 分析服务（依赖上述组件）
    // ❌ 移除单例注册，改为每个策略实例手动创建
    // container.registerSingleton(TYPES.PositionAnalyticsService, PositionAnalyticsService);

    // 流动性操作服务
    container.registerSingleton(
      LiquidityOperationService,
      LiquidityOperationService
    );

    // 连锁头寸管理器
    container.registerSingleton(ChainPositionManager, ChainPositionManager);

    // 第6层：新策略架构核心组件
    console.log("📦 注册第6层：新策略架构...");
    container.registerSingleton(TYPES.StrategyStorage, StrategyStorage);
    container.registerSingleton(TYPES.StrategyRegistry, StrategyRegistry);

    // 🆕 注册SimpleY模块服务（在SimpleYExecutor之前注册）
    container.registerSingleton(SimpleYPositionService, SimpleYPositionService);
    container.registerSingleton(
      SimpleYMonitoringService,
      SimpleYMonitoringService
    );
    container.registerSingleton(SimpleYRiskService, SimpleYRiskService);
    container.registerSingleton(SimpleYUtilityService, SimpleYUtilityService);
    // 同时注册字符串令牌，供container.resolve()使用
    container.register("SimpleYPositionService", {
      useToken: SimpleYPositionService,
    });
    container.register("SimpleYMonitoringService", {
      useToken: SimpleYMonitoringService,
    });
    container.register("SimpleYRiskService", { useToken: SimpleYRiskService });
    container.register("SimpleYUtilityService", {
      useToken: SimpleYUtilityService,
    });

    // 🔧 修复：注册简单Y策略需要的核心服务字符串token
    container.register("WalletService", { useToken: TYPES.WalletService });
    container.register("DLMMMonitorService", {
      useToken: TYPES.DLMMMonitorService,
    });
    container.register("SolanaWeb3Service", {
      useToken: TYPES.SolanaWeb3Service,
    });

    container.registerSingleton(TYPES.SimpleYExecutor, SimpleYExecutor);
    container.registerSingleton(
      TYPES.ChainPositionExecutor,
      ChainPositionExecutor
    );

    // 第6.5层：策略调度器（依赖注册表）
    console.log("📦 注册第6.5层：策略调度器...");
    container.registerSingleton(TYPES.StrategyScheduler, StrategyScheduler);

    // 第7层：策略管理器（最高层，依赖所有组件）
    console.log("📦 注册第7层：策略管理器...");
    container.registerSingleton(TYPES.StrategyManager, StrategyManager);

    // 注册接口令牌，用于依赖注入
    container.register("IStrategyManager", { useToken: TYPES.StrategyManager });

    // 第8层：健康检查服务（最高层，依赖所有策略组件）
    console.log("📦 注册第8层：健康检查服务...");
    container.registerSingleton(
      TYPES.StrategyHealthChecker,
      StrategyHealthChecker
    );

    // 第9层：重试管理器（模块化组件）
    console.log("📦 注册第9层：重试管理器...");
    container.registerSingleton(
      TYPES.SynchronousRetryManager,
      SynchronousRetryManager
    );

    // 第10层：池爬虫系统（模块化组件）- 暂时注释，待实现
    console.log("📦 注册第10层：池爬虫系统（暂时跳过）...");
    // container.registerSingleton('WebCrawlerService', PuppeteerWebCrawlerService);
    // container.registerSingleton('PoolDataParser', PoolDataParser);
    // container.registerSingleton('PoolFilterEngine', PoolFilterEngine);
    // container.registerSingleton('TokenFilterManager', TokenFilterManager);
    // container.registerSingleton('QualifiedPoolsManager', QualifiedPoolsManager);
    // container.registerSingleton('PoolPushStorageManager', PoolPushStorageManager);
    // container.registerSingleton('PoolCrawlerService', PoolCrawlerService);

    // 旧架构组件已全部移除，新架构已就绪

    console.log("✅ 服务层按依赖层级注册完成（包括池爬虫系统）");
  }

  /**
   * 注册外部服务（带降级机制）
   */
  private registerExternalServicesWithFallback(): void {
    try {
      container.registerSingleton(TYPES.JupiterService, JupiterService);
      console.log("   ✅ JupiterService注册成功");
    } catch (error) {
      console.warn("   ⚠️ JupiterService注册失败，将在运行时处理");
    }

    try {
      container.registerSingleton(TYPES.JupiterServiceV7, JupiterServiceV7);
      console.log("   ✅ JupiterServiceV7注册成功");
    } catch (error) {
      console.warn("   ⚠️ JupiterServiceV7注册失败，将在运行时处理");
    }

    try {
      container.registerSingleton(TYPES.MeteoraService, MeteoraService);
      // 同时注册为DLMMMonitorService（MeteoraService实现了IDLMMMonitorService接口）
      container.register(TYPES.DLMMMonitorService, {
        useToken: TYPES.MeteoraService,
      });
      console.log("   ✅ MeteoraService注册成功（包括DLMMMonitorService）");
    } catch (error) {
      console.warn("   ⚠️ MeteoraService注册失败，将在运行时处理");
    }

    try {
      container.registerSingleton(TYPES.HeliusService, HeliusService);
      console.log("   ✅ HeliusService注册成功");
    } catch (error) {
      console.warn("   ⚠️ HeliusService注册失败，将在运行时处理");
    }
  }

  /**
   * 获取服务实例
   */
  public getService<T>(type: symbol): T {
    if (!this.isInitialized) {
      throw new Error("容器未初始化，请先调用 initialize() 方法");
    }

    try {
      return container.resolve<T>(type);
    } catch (error) {
      console.error(`❌ 获取服务失败: ${type.toString()}`, error);
      throw error;
    }
  }

  /**
   * 检查服务是否已注册
   */
  public isRegistered(type: symbol): boolean {
    return container.isRegistered(type);
  }

  /**
   * 清理容器
   */
  public dispose(): void {
    container.clearInstances();
    this.isInitialized = false;
    console.log("🧹 依赖注入容器已清理");
  }

  /**
   * 验证容器健康状态
   */
  public async validateContainer(): Promise<boolean> {
    try {
      const keyServices = [
        TYPES.EventBus,
        TYPES.LoggerService,
        TYPES.ConfigService,
        TYPES.StateService,
      ];

      for (const serviceType of keyServices) {
        if (!this.isRegistered(serviceType)) {
          console.error(`❌ 关键服务未注册: ${serviceType.toString()}`);
          return false;
        }

        try {
          this.getService(serviceType);
        } catch (error) {
          console.error(`❌ 服务解析失败: ${serviceType.toString()}`, error);
          return false;
        }
      }

      console.log("✅ 容器健康检查通过");
      return true;
    } catch (error) {
      console.error("❌ 容器健康检查失败:", error);
      return false;
    }
  }
}

// 全局容器实例
export const diContainer = DIContainer.getInstance();

/**
 * 便捷的服务获取函数
 */
export function getService<T>(type: symbol): T {
  return diContainer.getService<T>(type);
}

/**
 * 初始化依赖注入系统
 */
export function initializeDI(): void {
  diContainer.initialize();
}

/**
 * 验证依赖注入健康状态
 */
export async function validateDI(): Promise<boolean> {
  return await diContainer.validateContainer();
}
