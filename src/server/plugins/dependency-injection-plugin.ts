/**
 * 🔧 Fastify依赖注入插件
 * 将现有的TSyringe依赖注入系统集成到Fastify中
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { DIContainer, getService } from "../../di/container";
import { TYPES } from "../../types/interfaces";
import type { ILoggerService } from "../../types/interfaces";

export interface DependencyInjectionPluginOptions {
  autoInitialize?: boolean;
}

const dependencyInjectionPlugin: FastifyPluginAsync<
  DependencyInjectionPluginOptions
> = async (fastify, options) => {
  const { autoInitialize = true } = options;

  let diContainer: DIContainer;
  let services: any;
  let logger: ILoggerService;

  if (autoInitialize) {
    // 初始化依赖注入容器
    diContainer = DIContainer.getInstance();
    diContainer.initialize();

    // 验证容器健康状态
    const isValid = await diContainer.validateContainer();
    if (!isValid) {
      throw new Error("依赖注入容器验证失败");
    }

    // 获取所有服务
    services = {
      // 基础设施服务
      eventBus: getService(TYPES.EventBus),
      logger: getService(TYPES.LoggerService),
      config: getService(TYPES.ConfigService),
      state: getService(TYPES.StateService),
      cache: getService(TYPES.CacheService),

      // 区块链服务
      solanaWeb3: getService(TYPES.SolanaWeb3Service),
      wallet: getService(TYPES.WalletService),
      multiRPC: getService(TYPES.MultiRPCService),
      gas: getService(TYPES.GasService),

      // 外部服务
      jupiter: getService(TYPES.JupiterService),
      meteora: getService(TYPES.MeteoraService),
      helius: getService(TYPES.HeliusService),

      // 业务服务
      positionManager: getService(TYPES.PositionManager),
      yPositionManager: getService(TYPES.YPositionManager),
      xPositionManager: getService(TYPES.XPositionManager),
      positionFeeHarvester: getService(TYPES.PositionFeeHarvester),
      positionInfo: getService(TYPES.PositionInfoService),

      // 新策略架构
      strategyManager: getService(TYPES.StrategyManager),
      strategyRegistry: getService(TYPES.StrategyRegistry),
      strategyScheduler: getService(TYPES.StrategyScheduler),
      strategyStorage: getService(TYPES.StrategyStorage),
      simpleYExecutor: getService(TYPES.SimpleYExecutor),
      chainPositionExecutor: getService(TYPES.ChainPositionExecutor),
      healthChecker: getService(TYPES.StrategyHealthChecker),
    };

    logger = services.logger;
  }

  // 装饰Fastify实例
  fastify.decorate("di", {
    container: diContainer,
    services: services,
    getService: <T>(type: symbol): T => {
      return getService<T>(type);
    },
    isRegistered: (type: symbol): boolean => {
      return diContainer?.isRegistered(type) || false;
    },
  });

  // 为每个请求添加服务访问
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 在请求对象上添加服务引用
      (request as any).services = services;
      (request as any).di = fastify.di;
    }
  );

  // 添加服务健康检查方法
  fastify.decorate("checkServiceHealth", async () => {
    if (!diContainer) {
      return { healthy: false, message: "DI container not initialized" };
    }

    try {
      const isValid = await diContainer.validateContainer();
      return {
        healthy: isValid,
        message: isValid
          ? "All services healthy"
          : "Some services are unhealthy",
        services: services ? Object.keys(services) : [],
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      };
    }
  });

  // 添加服务初始化方法
  fastify.decorate("initializeServices", async () => {
    if (!services) {
      throw new Error("Services not available");
    }

    const servicesToInitialize = [
      "wallet",
      "solanaWeb3",
      "multiRPC",
      "gas",
      "jupiter",
      "meteora",
      "helius",
    ];

    const results = [];

    for (const serviceName of servicesToInitialize) {
      const service = services[serviceName];
      if (service && typeof service.initialize === "function") {
        try {
          await service.initialize({});
          results.push({ service: serviceName, status: "success" });

          if (logger) {
            await logger.logBusinessOperation(
              `✅ ${serviceName} 服务初始化完成`,
              { serviceName }
            );
          }
        } catch (error) {
          results.push({
            service: serviceName,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });

          if (logger) {
            await logger.logError(
              "ServiceInit",
              `⚠️ ${serviceName} 服务初始化失败`,
              error as Error
            );
          }
        }
      }
    }

    return results;
  });

  // 添加服务启动方法
  fastify.decorate("startServices", async () => {
    if (!services) {
      throw new Error("Services not available");
    }

    const servicesToStart = ["gas"];
    const results = [];

    for (const serviceName of servicesToStart) {
      const service = services[serviceName];
      if (service && typeof service.start === "function") {
        try {
          await service.start();
          results.push({ service: serviceName, status: "started" });

          if (logger) {
            await logger.logBusinessOperation(
              `🚀 ${serviceName} 服务启动完成`,
              { serviceName }
            );
          }
        } catch (error) {
          results.push({
            service: serviceName,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });

          if (logger) {
            await logger.logError(
              "ServiceStart",
              `⚠️ ${serviceName} 服务启动失败`,
              error as Error
            );
          }
        }
      }
    }

    return results;
  });

  if (logger) {
    await logger.logSystem("INFO", "🔧 依赖注入插件已注册");
  }
};

// 扩展FastifyInstance接口
declare module "fastify" {
  interface FastifyInstance {
    di: {
      container: DIContainer;
      services: any;
      getService<T>(type: symbol): T;
      isRegistered(type: symbol): boolean;
    };
    checkServiceHealth(): Promise<{
      healthy: boolean;
      message: string;
      services?: string[];
      error?: any;
    }>;
    initializeServices(): Promise<
      Array<{
        service: string;
        status: string;
        error?: string;
      }>
    >;
    startServices(): Promise<
      Array<{
        service: string;
        status: string;
        error?: string;
      }>
    >;
  }

  interface FastifyRequest {
    services?: any;
    di?: any;
  }
}

export default fp(dependencyInjectionPlugin, {
  name: "dependency-injection-plugin",
});
