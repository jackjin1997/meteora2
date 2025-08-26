/**
 * 🚀 DLMM流动性管理系统 - Fastify服务器
 * 基于Fastify的高性能API服务器
 * 集成依赖注入系统，提供完整的API功能
 */

import Fastify, { FastifyInstance } from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import * as fs from "fs";
import * as path from "path";

// 导入依赖注入系统
import { DIContainer, getService } from "../di/container";
import { TYPES } from "../types/interfaces";
import type { ILoggerService } from "../types/interfaces";

// Fastify插件接口
export interface FastifyPluginOptions {
  services: any;
  logger: ILoggerService;
}

/**
 * DLMM Fastify服务器类
 * 高性能API服务器，支持WebSocket和实时监控
 */
export class DLMMFastifyServer {
  private app: FastifyInstance;
  private port: number;
  private host: string;

  // 服务实例
  private services: any;
  private logger!: ILoggerService;

  // 系统状态
  private isInitialized: boolean = false;
  private startTime: number = 0;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private isShuttingDown = false;

  constructor(port: number = 7001, host: string = "0.0.0.0") {
    this.port = port;
    this.host = host;

    // 创建Fastify实例
    this.app = Fastify({
      logger: {
        level: "info",
        prettyPrint: process.env.NODE_ENV === "development",
      },
      bodyLimit: 10485760, // 10MB
      keepAliveTimeout: 30000,
      requestTimeout: 30000,
      ignoreTrailingSlash: true,
      caseSensitive: false,
    });

    // 注册错误处理器
    this.setupErrorHandlers();
  }

  /**
   * 初始化依赖注入服务
   */
  private async initializeServices(): Promise<void> {
    try {
      // 初始化依赖注入容器
      const diContainer = DIContainer.getInstance();
      diContainer.initialize();

      // 验证容器健康状态
      const isValid = await diContainer.validateContainer();
      if (!isValid) {
        throw new Error("依赖注入容器验证失败");
      }

      // 创建服务映射对象
      this.services = {
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

      // 设置logger引用
      this.logger = this.services.logger;

      await this.logger.logSystem("INFO", "🔧 正在初始化依赖注入容器...");

      // 初始化关键服务
      await this.initializeCriticalServices();

      await this.logger.logSystem("INFO", "✅ 关键服务初始化完成");
    } catch (error) {
      console.error("❌ 服务初始化失败:", error);
      throw error;
    }
  }

  /**
   * 初始化关键服务
   */
  private async initializeCriticalServices(): Promise<void> {
    const servicesToInitialize = [
      "wallet",
      "solanaWeb3",
      "multiRPC",
      "gas",
      "jupiter",
      "meteora",
      "helius",
    ];

    for (const serviceName of servicesToInitialize) {
      const service = this.services[serviceName];
      if (service && typeof service.initialize === "function") {
        try {
          await service.initialize({});
          await this.logger.logBusinessOperation(
            `✅ ${serviceName} 服务初始化完成`,
            { serviceName }
          );
        } catch (error) {
          await this.logger.logError(
            "ServiceInit",
            `⚠️ ${serviceName} 服务初始化失败`,
            error as Error
          );
        }
      }
    }

    // 启动需要start方法的服务
    const servicesToStart = ["gas"];
    for (const serviceName of servicesToStart) {
      const service = this.services[serviceName];
      if (service && typeof service.start === "function") {
        try {
          await service.start();
          await this.logger.logBusinessOperation(
            `🚀 ${serviceName} 服务启动完成`,
            { serviceName }
          );
        } catch (error) {
          await this.logger.logError(
            "ServiceStart",
            `⚠️ ${serviceName} 服务启动失败`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers(): void {
    // 全局错误处理器
    this.app.setErrorHandler(async (error, request, reply) => {
      this.errorCount++;

      const errorInfo = {
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        statusCode: error.statusCode || 500,
      };

      // 记录错误日志
      if (this.logger) {
        await this.logger.logError(
          "API",
          `API错误: ${request.method} ${request.url}`,
          error
        );
      } else {
        console.error("❌ API错误:", errorInfo);
      }

      // 返回标准化错误响应
      const statusCode = error.statusCode || 500;
      let errorMessage = "内部服务器错误";
      let errorCode = "INTERNAL_SERVER_ERROR";

      // 根据错误类型设置响应
      if (error.validation) {
        errorMessage = "输入验证失败";
        errorCode = "VALIDATION_ERROR";
      } else if (statusCode === 401) {
        errorMessage = "未授权访问";
        errorCode = "UNAUTHORIZED";
      } else if (statusCode === 403) {
        errorMessage = "禁止访问";
        errorCode = "FORBIDDEN";
      } else if (statusCode === 404) {
        errorMessage = "资源未找到";
        errorCode = "NOT_FOUND";
      } else if (error.message) {
        errorMessage = error.message;
      }

      reply.status(statusCode).send({
        success: false,
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    });

    // 404处理器
    this.app.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        success: false,
        error: "接口不存在",
        code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    });
  }

  /**
   * 注册插件
   */
  private async registerPlugins(): Promise<void> {
    await this.logger.logSystem("INFO", "🔧 注册Fastify插件...");

    // 注册核心插件
    await this.app.register(require("@fastify/sensible"));

    // 安全插件
    await this.app.register(require("@fastify/helmet"), {
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "object-src": ["'none'"],
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", "ws:", "wss:"],
          "base-uri": ["'self'"],
          "font-src": ["'self'", "https:", "data:"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'self'"],
          "media-src": ["'self'"],
        },
      },
    });

    // CORS插件
    await this.app.register(require("@fastify/cors"), {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Request-ID",
      ],
    });

    // 压缩插件
    await this.app.register(require("@fastify/compress"));

    // 限流插件
    await this.app.register(require("@fastify/rate-limit"), {
      max: 1000, // 每个IP每分钟最多1000个请求
      timeWindow: "1 minute",
    });

    // WebSocket插件
    await this.app.register(require("@fastify/websocket"));

    // 静态文件插件
    const staticPaths = [
      path.join(__dirname, "../../web/public"),
      path.join(__dirname, "../web/public"),
      path.join(process.cwd(), "web/public"),
    ];

    const staticPath = staticPaths.find((p) => fs.existsSync(p));
    if (staticPath) {
      await this.app.register(require("@fastify/static"), {
        root: staticPath,
        prefix: "/",
      });
      await this.logger.logSystem("INFO", `📁 静态文件路径: ${staticPath}`);
    }

    // 注册自定义插件
    await this.registerCustomPlugins();

    await this.logger.logSystem("INFO", "✅ Fastify插件注册完成");
  }

  /**
   * 注册自定义插件
   */
  private async registerCustomPlugins(): Promise<void> {
    // 依赖注入插件
    const diPlugin = require("./plugins/dependency-injection-plugin").default;
    await this.app.register(diPlugin, { autoInitialize: false });

    // 日志插件
    const loggingPlugin = require("./plugins/logging-plugin").default;
    await this.app.register(loggingPlugin, { logger: this.logger });

    // 认证插件
    const authPlugin = require("./plugins/auth-plugin").default;
    await this.app.register(authPlugin, {
      publicPaths: ["/api/health", "/api/info", "/", "/ws"],
      jwtSecret: process.env.JWT_SECRET,
    });

    // 验证插件
    const validationPlugin = require("./plugins/validation-plugin").default;
    await this.app.register(validationPlugin, {
      enableBodyValidation: true,
      enableHeaderValidation: true,
    });

    // WebSocket服务
    const { FastifyWebSocketService } = require("./websocket-fastify");
    await this.app.register(FastifyWebSocketService.register());

    // 添加请求计数和性能监控
    await this.app.register(async (fastify) => {
      fastify.addHook("onRequest", async (request, reply) => {
        this.requestCount++;
        (request as any).startTime = Date.now();
      });

      fastify.addHook("onResponse", async (request, reply) => {
        const duration =
          Date.now() - ((request as any).startTime || Date.now());

        // 性能日志记录已由logging-plugin处理
      });
    });
  }

  /**
   * 注册路由
   */
  private async registerRoutes(): Promise<void> {
    await this.logger.logSystem("INFO", "🛣️ 注册API路由...");

    // 使用自动加载插件注册路由
    await this.app.register(require("@fastify/autoload"), {
      dir: path.join(__dirname, "routes-fastify"),
      options: {
        services: this.services,
        logger: this.logger,
      },
    });

    // 手动注册路由（如果需要）
    await this.registerManualRoutes();

    await this.logger.logSystem("INFO", "✅ API路由注册完成");
  }

  /**
   * 手动注册路由
   */
  private async registerManualRoutes(): Promise<void> {
    // 健康检查路由
    this.app.get("/api/health", async (request, reply) => {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        requests: this.requestCount,
        errors: this.errorCount,
        memory: process.memoryUsage(),
        version: "1.0.0-fastify",
      };

      reply.send({
        success: true,
        data: health,
      });
    });

    // 系统信息路由
    this.app.get("/api/info", async (request, reply) => {
      reply.send({
        success: true,
        data: {
          name: "DLMM流动性管理系统",
          version: "1.0.0-fastify",
          description: "基于Fastify的高性能DLMM流动性自动化管理系统",
          framework: "Fastify",
          node: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      });
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    try {
      this.startTime = Date.now();

      console.log("🚀 启动DLMM Fastify服务器...");

      // 初始化服务
      await this.initializeServices();

      // 注册插件
      await this.registerPlugins();

      // 注册路由
      await this.registerRoutes();

      // 启动服务器
      await this.app.listen({
        port: this.port,
        host: this.host,
      });

      this.isInitialized = true;

      await this.logger.logSystem(
        "INFO",
        `🚀 DLMM Fastify服务器启动成功 - http://${this.host}:${this.port}`
      );

      console.log(
        `🚀 DLMM Fastify服务器启动成功 - http://${this.host}:${this.port}`
      );
    } catch (error) {
      console.error("❌ 服务器启动失败:", error);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;

    try {
      if (this.logger) {
        await this.logger.logSystem("INFO", "🛑 正在关闭DLMM Fastify服务器...");
      }

      await this.app.close();

      if (this.logger) {
        await this.logger.logSystem("INFO", "✅ DLMM Fastify服务器已关闭");
      }

      console.log("✅ DLMM Fastify服务器已关闭");
    } catch (error) {
      console.error("❌ 服务器关闭失败:", error);
      throw error;
    }
  }

  /**
   * 获取Fastify实例
   */
  getApp(): FastifyInstance {
    return this.app;
  }

  /**
   * 获取服务实例
   */
  getServices(): any {
    return this.services;
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      startTime: this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime,
    };
  }
}

// 添加类型扩展
declare module "fastify" {
  interface FastifyInstance {
    services: any;
    logger: ILoggerService;
  }

  interface FastifyRequest {
    startTime?: number;
  }
}

export default DLMMFastifyServer;
