/**
 * 🚀 DLMM流动性管理系统 - Fastify应用启动器
 * 基于Fastify的高性能应用入口
 */

import "reflect-metadata";
import DLMMFastifyServer from "./server/fastify-server";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 从环境变量获取配置
const API_PORT = parseInt(process.env.API_PORT || "7001", 10);
const SERVER_HOST = process.env.SERVER_HOST || "0.0.0.0";

async function bootstrap() {
  try {
    console.log("🌟 启动DLMM流动性管理系统 (Fastify版本)...");

    // 创建Fastify服务器实例
    const server = new DLMMFastifyServer(API_PORT, SERVER_HOST);

    // 设置优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);

      try {
        await server.stop();
        console.log("✅ 应用已优雅关闭");
        process.exit(0);
      } catch (error) {
        console.error("❌ 优雅关闭失败:", error);
        process.exit(1);
      }
    };

    // 注册信号处理器
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // 处理未捕获的异常
    process.on("uncaughtException", (error) => {
      console.error("❌ 未捕获的异常:", error);
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ 未处理的Promise拒绝:", reason);
      gracefulShutdown("unhandledRejection");
    });

    // 启动服务器
    await server.start();

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  🌟 DLMM流动性管理系统 (Fastify版本) 启动成功!                  ║
║                                                                ║
║  🌐 API服务器:     http://${SERVER_HOST}:${API_PORT.toString().padEnd(26)} ║
║  📊 健康检查:      http://${SERVER_HOST}:${API_PORT}/api/health${" ".repeat(15)} ║
║  📖 系统信息:      http://${SERVER_HOST}:${API_PORT}/api/info${" ".repeat(17)} ║
║                                                                ║
║  🚀 框架:          Fastify (高性能)                           ║
║  🔧 依赖注入:      TSyringe                                   ║
║  📝 日志系统:      三层分离架构                               ║
║  🎯 策略引擎:      7大独立策略模块                            ║
║                                                                ║
║  💡 提示: 使用 Ctrl+C 优雅关闭应用                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error("❌ 应用启动失败:", error);
    process.exit(1);
  }
}

// 启动应用
bootstrap().catch((error) => {
  console.error("❌ 应用启动失败:", error);
  process.exit(1);
});
