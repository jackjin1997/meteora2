/**
 * 🏥 Fastify健康检查路由
 * 提供系统健康状态和服务监控
 */

import { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (fastify, options) => {
  // 基础健康检查
  fastify.get("/api/health", async (request, reply) => {
    try {
      const startTime = Date.now();

      // 检查服务健康状态
      const serviceHealth = await fastify.checkServiceHealth();

      const health = {
        status: serviceHealth.healthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime() * 1000, // 转换为毫秒
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        framework: "Fastify",
        version: "1.0.0-fastify",
        responseTime: Date.now() - startTime,
        services: serviceHealth,
      };

      // 记录健康检查
      await fastify.logRequest(request, "健康检查请求", {
        status: health.status,
      });

      reply.send({
        success: true,
        data: health,
      });
    } catch (error) {
      await fastify.logError(
        request,
        "HealthCheck",
        "健康检查失败",
        error as Error
      );

      reply.status(500).send({
        success: false,
        error: "健康检查失败",
        code: "HEALTH_CHECK_ERROR",
      });
    }
  });

  // 详细健康检查
  fastify.get("/api/health/detailed", async (request, reply) => {
    try {
      const startTime = Date.now();

      // 获取详细的服务状态
      const serviceHealth = await fastify.checkServiceHealth();
      const initResults = await fastify.initializeServices();

      const detailed = {
        status: serviceHealth.healthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        system: {
          uptime: process.uptime() * 1000,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          loadAverage: process.platform !== "win32" ? process.loadavg() : null,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        services: {
          diContainer: serviceHealth,
          initialization: initResults,
          total: serviceHealth.services?.length || 0,
          healthy: initResults.filter((r) => r.status === "success").length,
          errors: initResults.filter((r) => r.status === "error").length,
        },
        performance: {
          responseTime: Date.now() - startTime,
          memoryUsageMB: Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024
          ),
        },
      };

      reply.send({
        success: true,
        data: detailed,
      });
    } catch (error) {
      await fastify.logError(
        request,
        "DetailedHealthCheck",
        "详细健康检查失败",
        error as Error
      );

      reply.status(500).send({
        success: false,
        error: "详细健康检查失败",
        code: "DETAILED_HEALTH_CHECK_ERROR",
      });
    }
  });

  // 系统信息
  fastify.get("/api/info", async (request, reply) => {
    try {
      const info = {
        name: "DLMM流动性管理系统",
        version: "1.0.0-fastify",
        description: "基于Fastify的高性能DLMM流动性自动化管理系统",
        framework: {
          name: "Fastify",
          version: fastify.version,
        },
        features: [
          "🚀 高性能API服务器",
          "🔧 依赖注入系统",
          "📝 三层分离日志架构",
          "🎯 7大独立策略模块",
          "⚡ WebSocket实时监控",
          "🔒 企业级安全防护",
          "📊 策略性能分析",
        ],
        endpoints: {
          health: "/api/health",
          detailedHealth: "/api/health/detailed",
          wallet: "/api/wallet",
          positions: "/api/positions",
          strategies: "/api/strategies",
          pools: "/api/pools",
          analytics: "/api/analytics",
        },
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          env: process.env.NODE_ENV || "development",
        },
        timestamp: new Date().toISOString(),
      };

      await fastify.logRequest(request, "系统信息请求");

      reply.send({
        success: true,
        data: info,
      });
    } catch (error) {
      await fastify.logError(
        request,
        "SystemInfo",
        "获取系统信息失败",
        error as Error
      );

      reply.status(500).send({
        success: false,
        error: "获取系统信息失败",
        code: "SYSTEM_INFO_ERROR",
      });
    }
  });

  // 就绪检查
  fastify.get("/api/ready", async (request, reply) => {
    try {
      const serviceHealth = await fastify.checkServiceHealth();

      if (serviceHealth.healthy) {
        reply.send({
          success: true,
          status: "ready",
          timestamp: new Date().toISOString(),
        });
      } else {
        reply.status(503).send({
          success: false,
          status: "not_ready",
          error: serviceHealth.message,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      await fastify.logError(
        request,
        "ReadinessCheck",
        "就绪检查失败",
        error as Error
      );

      reply.status(503).send({
        success: false,
        status: "not_ready",
        error: "就绪检查失败",
        code: "READINESS_CHECK_ERROR",
      });
    }
  });

  // 存活检查
  fastify.get("/api/alive", async (request, reply) => {
    reply.send({
      success: true,
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime() * 1000,
    });
  });
};

export default healthRoutes;
