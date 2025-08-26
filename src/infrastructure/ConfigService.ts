/**
 * 🔧 配置服务 - 管理应用程序配置
 * 提供集中化的配置管理和环境变量处理
 */

export class ConfigService {
  public readonly name = "ConfigService";
  public readonly version = "1.0.0";
  public readonly dependencies: string[] = [];

  private config: Record<string, any> = {};
  private isInitialized = false;

  async initialize(options: any): Promise<void> {
    // 加载环境变量
    this.loadEnvironmentVariables();

    // 设置默认配置
    this.setDefaults();

    this.isInitialized = true;
  }

  async start(): Promise<void> {
    // 配置服务启动逻辑
  }

  async stop(): Promise<void> {
    // 配置服务停止逻辑
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    return {
      healthy: this.isInitialized,
      details: {
        configCount: Object.keys(this.config).length,
      },
    };
  }

  async getMetrics(): Promise<any> {
    return {
      configItems: Object.keys(this.config).length,
      initialized: this.isInitialized,
    };
  }

  private loadEnvironmentVariables(): void {
    // 加载常用环境变量
    const envVars = [
      "NODE_ENV",
      "PORT",
      "WS_PORT",
      "SOLANA_RPC_URL",
      "PRIVATE_KEY",
      "LOG_LEVEL",
    ];

    envVars.forEach((varName) => {
      const value = process.env[varName];
      if (value !== undefined) {
        this.set(varName.toLowerCase(), value);
      }
    });
  }

  private setDefaults(): void {
    // 设置默认配置
    const defaults = {
      node_env: "development",
      port: 7000,
      ws_port: 7002,
      solana_rpc_url: "https://api.mainnet-beta.solana.com",
      log_level: "info",
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!this.config[key]) {
        this.set(key, value);
      }
    });
  }

  get(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.config[key] = value;
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }
}
