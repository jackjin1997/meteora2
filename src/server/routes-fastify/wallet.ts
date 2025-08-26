/**
 * 💰 Fastify钱包管理路由
 * 提供钱包创建、导入、管理等功能
 */

import { FastifyPluginAsync } from "fastify";

// 钱包相关的JSON Schema
const walletSchemas = {
  createWallet: {
    type: "object",
    properties: {
      password: { type: "string", minLength: 8 },
    },
  },

  importWallet: {
    type: "object",
    required: ["privateKey"],
    properties: {
      privateKey: { type: "string", minLength: 80, maxLength: 90 },
      password: { type: "string", minLength: 8 },
    },
  },

  unlockWallet: {
    type: "object",
    required: ["password"],
    properties: {
      password: { type: "string", minLength: 1 },
    },
  },
};

const walletRoutes: FastifyPluginAsync = async (fastify, options) => {
  // 获取钱包信息
  fastify.get("/api/wallet/info", async (request, reply) => {
    try {
      const walletService = request.services?.wallet;

      if (!walletService) {
        throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
      }

      const walletInfo = await walletService.getWalletInfo();

      await fastify.logRequest(request, "获取钱包信息", {
        hasWallet: !!walletInfo,
        status: walletInfo?.status,
      });

      reply.send({
        success: true,
        data: walletInfo,
      });
    } catch (error) {
      await fastify.logError(
        request,
        "Wallet",
        "获取钱包信息失败",
        error as Error
      );

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "获取钱包信息失败",
        code: "GET_WALLET_INFO_ERROR",
      });
    }
  });

  // 创建新钱包
  fastify.post(
    "/api/wallet/create",
    {
      schema: {
        body: walletSchemas.createWallet,
      },
    },
    async (request, reply) => {
      try {
        const { password } = request.body as { password?: string };
        const walletService = request.services?.wallet;

        if (!walletService) {
          throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
        }

        // 验证密码
        if (password) {
          fastify.validateRequired({ password }, ["password"]);

          if (password.length < 8) {
            throw fastify.httpErrors.badRequest("密码长度至少8位");
          }
        }

        const walletInfo = await walletService.createWallet(password);

        await fastify.logRequest(request, "创建钱包成功", {
          address: walletInfo.address,
          encrypted: walletInfo.isEncrypted,
        });

        reply.send({
          success: true,
          data: walletInfo,
          message: "钱包创建成功",
        });
      } catch (error) {
        await fastify.logError(
          request,
          "Wallet",
          "创建钱包失败",
          error as Error
        );

        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "创建钱包失败",
          code: "CREATE_WALLET_ERROR",
        });
      }
    }
  );

  // 导入钱包
  fastify.post(
    "/api/wallet/import",
    {
      schema: {
        body: walletSchemas.importWallet,
      },
    },
    async (request, reply) => {
      try {
        const { privateKey, password } = request.body as {
          privateKey: string;
          password?: string;
        };
        const walletService = request.services?.wallet;

        if (!walletService) {
          throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
        }

        // 验证私钥格式
        if (!privateKey || privateKey.length < 80 || privateKey.length > 90) {
          throw fastify.httpErrors.badRequest("无效的私钥格式");
        }

        const walletInfo = await walletService.importFromPrivateKey(
          privateKey,
          password
        );

        await fastify.logRequest(request, "导入钱包成功", {
          address: walletInfo.address,
          encrypted: walletInfo.isEncrypted,
        });

        reply.send({
          success: true,
          data: walletInfo,
          message: "钱包导入成功",
        });
      } catch (error) {
        await fastify.logError(
          request,
          "Wallet",
          "导入钱包失败",
          error as Error
        );

        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "导入钱包失败",
          code: "IMPORT_WALLET_ERROR",
        });
      }
    }
  );

  // 解锁钱包
  fastify.post(
    "/api/wallet/unlock",
    {
      schema: {
        body: walletSchemas.unlockWallet,
      },
    },
    async (request, reply) => {
      try {
        const { password } = request.body as { password: string };
        const walletService = request.services?.wallet;

        if (!walletService) {
          throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
        }

        const success = await walletService.unlockWallet(password);

        if (success) {
          await fastify.logRequest(request, "钱包解锁成功");

          reply.send({
            success: true,
            message: "钱包解锁成功",
          });
        } else {
          await fastify.logRequest(request, "钱包解锁失败：密码错误");

          reply.status(401).send({
            success: false,
            error: "密码错误",
            code: "INVALID_PASSWORD",
          });
        }
      } catch (error) {
        await fastify.logError(
          request,
          "Wallet",
          "解锁钱包失败",
          error as Error
        );

        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "解锁钱包失败",
          code: "UNLOCK_WALLET_ERROR",
        });
      }
    }
  );

  // 锁定钱包
  fastify.post("/api/wallet/lock", async (request, reply) => {
    try {
      const walletService = request.services?.wallet;

      if (!walletService) {
        throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
      }

      walletService.lockWallet();

      await fastify.logRequest(request, "钱包已锁定");

      reply.send({
        success: true,
        message: "钱包已锁定",
      });
    } catch (error) {
      await fastify.logError(request, "Wallet", "锁定钱包失败", error as Error);

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "锁定钱包失败",
        code: "LOCK_WALLET_ERROR",
      });
    }
  });

  // 获取SOL余额
  fastify.get("/api/wallet/balance", async (request, reply) => {
    try {
      const walletService = request.services?.wallet;

      if (!walletService) {
        throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
      }

      const balance = await walletService.getSolBalance();

      await fastify.logRequest(request, "获取SOL余额", { balance });

      reply.send({
        success: true,
        data: {
          balance,
          symbol: "SOL",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      await fastify.logError(request, "Wallet", "获取余额失败", error as Error);

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "获取余额失败",
        code: "GET_BALANCE_ERROR",
      });
    }
  });

  // 删除钱包
  fastify.delete("/api/wallet", async (request, reply) => {
    try {
      const walletService = request.services?.wallet;

      if (!walletService) {
        throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
      }

      await walletService.deleteWallet();

      await fastify.logRequest(request, "钱包已删除");

      reply.send({
        success: true,
        message: "钱包已删除",
      });
    } catch (error) {
      await fastify.logError(request, "Wallet", "删除钱包失败", error as Error);

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "删除钱包失败",
        code: "DELETE_WALLET_ERROR",
      });
    }
  });

  // 获取钱包状态
  fastify.get("/api/wallet/status", async (request, reply) => {
    try {
      const walletService = request.services?.wallet;

      if (!walletService) {
        throw fastify.httpErrors.serviceUnavailable("钱包服务不可用");
      }

      const exists = walletService.isWalletExists();
      const unlocked = walletService.isWalletUnlocked();
      const info = await walletService.getWalletInfo();

      const status = {
        exists,
        unlocked,
        info,
        timestamp: new Date().toISOString(),
      };

      reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      await fastify.logError(
        request,
        "Wallet",
        "获取钱包状态失败",
        error as Error
      );

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "获取钱包状态失败",
        code: "GET_WALLET_STATUS_ERROR",
      });
    }
  });
};

export default walletRoutes;
