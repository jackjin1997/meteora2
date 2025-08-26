/**
 * 🔌 Fastify WebSocket服务
 * 提供实时数据推送和策略监控
 */

import { FastifyPluginAsync } from "fastify";
import { SocketStream } from "@fastify/websocket";
import { IncomingMessage } from "http";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

interface WebSocketClient {
  id: string;
  socket: SocketStream;
  subscriptions: Set<string>;
  lastHeartbeat: number;
}

export class FastifyWebSocketService {
  private clients: Map<string, WebSocketClient> = new Map();
  private messageHistory: Map<string, WebSocketMessage[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;

    // 心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000); // 30秒检查一次
  }

  /**
   * 注册WebSocket路由
   */
  static register(): FastifyPluginAsync {
    return async (fastify, options) => {
      const wsService = new FastifyWebSocketService(fastify.logger);

      // 注册WebSocket路由
      fastify.register(async function (fastify) {
        // 主WebSocket连接
        fastify.get(
          "/ws",
          { websocket: true },
          async (connection: SocketStream, req: IncomingMessage) => {
            await wsService.handleConnection(connection, req);
          }
        );

        // 策略监控WebSocket
        fastify.get(
          "/ws/strategy",
          { websocket: true },
          async (connection: SocketStream, req: IncomingMessage) => {
            await wsService.handleStrategyConnection(connection, req);
          }
        );

        // 市场数据WebSocket
        fastify.get(
          "/ws/market",
          { websocket: true },
          async (connection: SocketStream, req: IncomingMessage) => {
            await wsService.handleMarketConnection(connection, req);
          }
        );

        // 系统监控WebSocket
        fastify.get(
          "/ws/system",
          { websocket: true },
          async (connection: SocketStream, req: IncomingMessage) => {
            await wsService.handleSystemConnection(connection, req);
          }
        );
      });

      // 装饰Fastify实例
      fastify.decorate("ws", wsService);

      return wsService;
    };
  }

  /**
   * 处理WebSocket连接
   */
  async handleConnection(
    connection: SocketStream,
    req: IncomingMessage
  ): Promise<void> {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket: connection,
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    await this.logger?.logSystem("INFO", `WebSocket连接建立: ${clientId}`);

    // 发送欢迎消息
    this.sendToClient(clientId, {
      type: "welcome",
      data: {
        clientId,
        timestamp: new Date().toISOString(),
        availableChannels: ["strategy", "market", "system", "health"],
      },
      timestamp: new Date().toISOString(),
    });

    // 监听消息
    connection.socket.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        await this.handleMessage(clientId, message);
      } catch (error) {
        await this.logger?.logError(
          "WebSocket",
          `解析消息失败: ${clientId}`,
          error as Error
        );
      }
    });

    // 监听连接关闭
    connection.socket.on("close", async () => {
      await this.handleDisconnection(clientId);
    });

    // 监听错误
    connection.socket.on("error", async (error) => {
      await this.logger?.logError("WebSocket", `连接错误: ${clientId}`, error);
      await this.handleDisconnection(clientId);
    });
  }

  /**
   * 处理策略专用连接
   */
  async handleStrategyConnection(
    connection: SocketStream,
    req: IncomingMessage
  ): Promise<void> {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket: connection,
      subscriptions: new Set(["strategy"]),
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    await this.logger?.logSystem(
      "INFO",
      `策略监控WebSocket连接建立: ${clientId}`
    );

    // 发送策略数据
    this.sendToClient(clientId, {
      type: "strategy.welcome",
      data: {
        clientId,
        message: "策略监控连接已建立",
        features: ["实时策略状态", "收益监控", "风险告警"],
      },
      timestamp: new Date().toISOString(),
    });

    this.setupConnectionHandlers(connection, clientId);
  }

  /**
   * 处理市场数据连接
   */
  async handleMarketConnection(
    connection: SocketStream,
    req: IncomingMessage
  ): Promise<void> {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket: connection,
      subscriptions: new Set(["market"]),
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    await this.logger?.logSystem(
      "INFO",
      `市场数据WebSocket连接建立: ${clientId}`
    );

    this.sendToClient(clientId, {
      type: "market.welcome",
      data: {
        clientId,
        message: "市场数据连接已建立",
        features: ["实时价格", "池子状态", "活跃Bin监控"],
      },
      timestamp: new Date().toISOString(),
    });

    this.setupConnectionHandlers(connection, clientId);
  }

  /**
   * 处理系统监控连接
   */
  async handleSystemConnection(
    connection: SocketStream,
    req: IncomingMessage
  ): Promise<void> {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      socket: connection,
      subscriptions: new Set(["system"]),
      lastHeartbeat: Date.now(),
    };

    this.clients.set(clientId, client);

    await this.logger?.logSystem(
      "INFO",
      `系统监控WebSocket连接建立: ${clientId}`
    );

    this.sendToClient(clientId, {
      type: "system.welcome",
      data: {
        clientId,
        message: "系统监控连接已建立",
        features: ["性能监控", "服务状态", "错误告警"],
      },
      timestamp: new Date().toISOString(),
    });

    this.setupConnectionHandlers(connection, clientId);
  }

  /**
   * 设置连接处理器
   */
  private setupConnectionHandlers(
    connection: SocketStream,
    clientId: string
  ): void {
    connection.socket.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        await this.handleMessage(clientId, message);
      } catch (error) {
        await this.logger?.logError(
          "WebSocket",
          `解析消息失败: ${clientId}`,
          error as Error
        );
      }
    });

    connection.socket.on("close", async () => {
      await this.handleDisconnection(clientId);
    });

    connection.socket.on("error", async (error) => {
      await this.logger?.logError("WebSocket", `连接错误: ${clientId}`, error);
      await this.handleDisconnection(clientId);
    });
  }

  /**
   * 处理客户端消息
   */
  private async handleMessage(clientId: string, message: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastHeartbeat = Date.now();

    switch (message.type) {
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
        break;

      case "subscribe":
        if (message.channel) {
          client.subscriptions.add(message.channel);
          this.sendToClient(clientId, {
            type: "subscribed",
            data: { channel: message.channel },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case "unsubscribe":
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          this.sendToClient(clientId, {
            type: "unsubscribed",
            data: { channel: message.channel },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        await this.logger?.logSystem(
          "WARN",
          `未知消息类型: ${message.type} from ${clientId}`
        );
    }
  }

  /**
   * 处理连接断开
   */
  private async handleDisconnection(clientId: string): Promise<void> {
    this.clients.delete(clientId);
    await this.logger?.logSystem("INFO", `WebSocket连接断开: ${clientId}`);
  }

  /**
   * 发送消息给指定客户端
   */
  public sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === 1) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        this.logger?.logError(
          "WebSocket",
          `发送消息失败: ${clientId}`,
          error as Error
        );
      }
    }
  }

  /**
   * 广播消息给所有客户端
   */
  public broadcast(message: WebSocketMessage, channel?: string): void {
    for (const [clientId, client] of this.clients) {
      if (!channel || client.subscriptions.has(channel)) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * 发送策略更新
   */
  public sendStrategyUpdate(strategyData: any): void {
    this.broadcast(
      {
        type: "strategy.update",
        data: strategyData,
        timestamp: new Date().toISOString(),
      },
      "strategy"
    );
  }

  /**
   * 发送市场数据更新
   */
  public sendMarketUpdate(marketData: any): void {
    this.broadcast(
      {
        type: "market.update",
        data: marketData,
        timestamp: new Date().toISOString(),
      },
      "market"
    );
  }

  /**
   * 发送系统状态更新
   */
  public sendSystemUpdate(systemData: any): void {
    this.broadcast(
      {
        type: "system.update",
        data: systemData,
        timestamp: new Date().toISOString(),
      },
      "system"
    );
  }

  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查心跳
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = 60000; // 60秒超时

    for (const [clientId, client] of this.clients) {
      if (now - client.lastHeartbeat > timeout) {
        this.logger?.logSystem("WARN", `客户端心跳超时，断开连接: ${clientId}`);
        client.socket.close();
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * 获取连接统计
   */
  public getStats() {
    return {
      totalConnections: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        subscriptions: Array.from(client.subscriptions),
        lastHeartbeat: client.lastHeartbeat,
        connected: client.socket.readyState === 1,
      })),
    };
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [clientId, client] of this.clients) {
      client.socket.close();
    }

    this.clients.clear();
  }
}

// 扩展FastifyInstance接口
declare module "fastify" {
  interface FastifyInstance {
    ws: FastifyWebSocketService;
  }
}

export default FastifyWebSocketService;
