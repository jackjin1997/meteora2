/**
 * 📝 Fastify日志插件
 * 记录API请求和响应，集成三层日志架构
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { TraceContext } from "../../infrastructure/logging/TraceContext";
import { TimeFormatter } from "../../infrastructure/logging/TimeFormatter";
import type { ILoggerService } from "../../types/interfaces";
import { LogLevel } from "../../types/logging";

export interface LoggingPluginOptions {
  logger: ILoggerService;
}

const loggingPlugin: FastifyPluginAsync<LoggingPluginOptions> = async (
  fastify,
  options
) => {
  const logger = options.logger;

  if (!logger) {
    throw new Error("Logger service is required for logging plugin");
  }

  // 请求开始钩子
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 生成追踪ID
      const traceId = TraceContext.generateTraceId();

      // 在请求对象上存储追踪信息
      (request as any).traceId = traceId;
      (request as any).startTime = TimeFormatter.now();

      // 在追踪上下文中运行
      TraceContext.run(traceId, async () => {
        const requestInfo = {
          method: request.method,
          url: request.url,
          userAgent: request.headers["user-agent"],
          ip: request.ip,
          contentLength: request.headers["content-length"],
        };

        await logger.logSystem(
          LogLevel.INFO as any,
          `请求开始: ${request.method} ${request.url}`,
          traceId
        );
      });
    }
  );

  // 响应完成钩子
  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const traceId = (request as any).traceId;
      const startTime = (request as any).startTime;

      if (traceId && startTime) {
        TraceContext.run(traceId, async () => {
          const duration = TimeFormatter.duration(startTime);

          const responseInfo = {
            statusCode: reply.statusCode,
            contentLength: reply.getHeader("content-length"),
            duration: `${duration}ms`,
          };

          await logger.logSystem(
            LogLevel.INFO as any,
            `请求完成: ${request.method} ${request.url} - ${reply.statusCode} (${duration}ms)`,
            traceId
          );
        });
      }
    }
  );

  // 错误钩子
  fastify.addHook(
    "onError",
    async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const traceId = (request as any).traceId;

      if (traceId) {
        await logger.logError(
          "system-http",
          `请求错误: ${request.method} ${request.url}`,
          error,
          traceId
        );
      }
    }
  );

  // 装饰器：为路由处理器提供日志方法
  fastify.decorate(
    "logRequest",
    async (request: FastifyRequest, message: string, data?: any) => {
      const traceId = (request as any).traceId;
      if (traceId) {
        await logger.logBusinessOperation(message, data, traceId);
      }
    }
  );

  fastify.decorate(
    "logError",
    async (
      request: FastifyRequest,
      category: string,
      message: string,
      error?: Error
    ) => {
      const traceId = (request as any).traceId;
      await logger.logError(category, message, error, traceId);
    }
  );
};

// 扩展FastifyInstance接口
declare module "fastify" {
  interface FastifyInstance {
    logRequest(
      request: FastifyRequest,
      message: string,
      data?: any
    ): Promise<void>;
    logError(
      request: FastifyRequest,
      category: string,
      message: string,
      error?: Error
    ): Promise<void>;
  }

  interface FastifyRequest {
    traceId?: string;
    startTime?: number;
  }
}

export default fp(loggingPlugin, {
  name: "logging-plugin",
});
