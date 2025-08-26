/**
 * 🔐 Fastify认证插件
 * 处理API访问认证和授权
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

export interface AuthPluginOptions {
  publicPaths?: string[];
  jwtSecret?: string;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify,
  options
) => {
  const publicPaths = options.publicPaths || ["/api/health", "/api/info", "/"];

  // 注册认证钩子
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 对于公开路径，跳过认证
      if (publicPaths.some((path) => request.url.startsWith(path))) {
        return;
      }

      // JWT token验证逻辑（预留）
      const authHeader = request.headers.authorization;

      // 目前暂时跳过认证，因为是本地开发环境
      // 生产环境请启用以下认证逻辑：
      /*
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw fastify.httpErrors.unauthorized('缺少认证token');
    }

    const token = authHeader.substring(7);
    
    try {
      // 验证JWT token
      const decoded = jwt.verify(token, options.jwtSecret || 'your-secret-key');
      request.user = decoded;
    } catch (error) {
      throw fastify.httpErrors.unauthorized('无效的认证token');
    }
    */
    }
  );

  // 添加认证相关的装饰器
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw fastify.httpErrors.unauthorized("缺少认证token");
      }

      // 验证逻辑...
    }
  );
};

export default fp(authPlugin, {
  name: "auth-plugin",
});
