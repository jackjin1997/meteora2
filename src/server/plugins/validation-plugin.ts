/**
 * ✅ Fastify验证插件
 * 验证API请求参数和数据
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

export interface ValidationPluginOptions {
  enableBodyValidation?: boolean;
  enableHeaderValidation?: boolean;
  requiredHeaders?: string[];
}

const validationPlugin: FastifyPluginAsync<ValidationPluginOptions> = async (
  fastify,
  options
) => {
  const {
    enableBodyValidation = true,
    enableHeaderValidation = true,
    requiredHeaders = [],
  } = options;

  // 请求验证钩子
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // JSON格式验证
      if (enableBodyValidation && ["POST", "PUT"].includes(request.method)) {
        const contentType = request.headers["content-type"];

        if (contentType?.includes("application/json")) {
          if (request.body === undefined || request.body === null) {
            throw fastify.httpErrors.badRequest("请求体不能为空");
          }

          // 验证JSON结构（如果需要更复杂的验证）
          if (typeof request.body !== "object") {
            throw fastify.httpErrors.badRequest("请求体必须是有效的JSON对象");
          }
        }
      }

      // 请求头验证
      if (enableHeaderValidation) {
        // 检查User-Agent
        if (!request.headers["user-agent"]) {
          fastify.log.warn(
            {
              method: request.method,
              url: request.url,
              ip: request.ip,
            },
            "请求缺少User-Agent头"
          );
        }

        // 检查必需的自定义头
        for (const header of requiredHeaders) {
          if (!request.headers[header.toLowerCase()]) {
            throw fastify.httpErrors.badRequest(`缺少必需的请求头: ${header}`);
          }
        }
      }
    }
  );

  // 添加验证装饰器
  fastify.decorate("validateRequired", (data: any, fields: string[]) => {
    const missing = [];

    for (const field of fields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw fastify.httpErrors.badRequest(
        `缺少必需字段: ${missing.join(", ")}`
      );
    }
  });

  fastify.decorate(
    "validateTypes",
    (data: any, schema: Record<string, string>) => {
      const errors = [];

      for (const [field, expectedType] of Object.entries(schema)) {
        if (data[field] !== undefined) {
          const actualType = typeof data[field];

          if (actualType !== expectedType) {
            errors.push(
              `字段 ${field} 应为 ${expectedType} 类型，实际为 ${actualType}`
            );
          }
        }
      }

      if (errors.length > 0) {
        throw fastify.httpErrors.badRequest(
          `类型验证失败: ${errors.join("; ")}`
        );
      }
    }
  );

  fastify.decorate(
    "validateRange",
    (value: number, min: number, max: number, fieldName: string) => {
      if (value < min || value > max) {
        throw fastify.httpErrors.badRequest(
          `字段 ${fieldName} 的值 ${value} 超出允许范围 [${min}, ${max}]`
        );
      }
    }
  );

  fastify.decorate(
    "validateEnum",
    (value: any, allowedValues: any[], fieldName: string) => {
      if (!allowedValues.includes(value)) {
        throw fastify.httpErrors.badRequest(
          `字段 ${fieldName} 的值 ${value} 不在允许值列表中: ${allowedValues.join(", ")}`
        );
      }
    }
  );
};

// 扩展FastifyInstance接口
declare module "fastify" {
  interface FastifyInstance {
    validateRequired(data: any, fields: string[]): void;
    validateTypes(data: any, schema: Record<string, string>): void;
    validateRange(
      value: number,
      min: number,
      max: number,
      fieldName: string
    ): void;
    validateEnum(value: any, allowedValues: any[], fieldName: string): void;
  }
}

export default fp(validationPlugin, {
  name: "validation-plugin",
});
