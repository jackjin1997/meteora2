/**
 * 🏥 服务健康检查工具
 * 提供服务降级和容错机制
 */

export class ServiceHealthChecker {
  /**
   * 安全获取服务实例
   */
  static safeGetService<T>(
    container: any,
    serviceType: symbol,
    fallback?: T,
  ): T | null {
    try {
      if (container.isRegistered && container.isRegistered(serviceType)) {
        return container.getService(serviceType) as T;
      }
      return fallback || null;
    } catch (error) {
      console.warn(`⚠️ 服务获取失败: ${serviceType.toString()}`, error);
      return fallback || null;
    }
  }

  /**
   * 检查服务是否可用
   */
  static async isServiceHealthy(service: any): Promise<boolean> {
    if (!service) return false;

    try {
      if (typeof service.healthCheck === "function") {
        const health = await service.healthCheck();
        return health.healthy === true;
      }
      return true; // 没有健康检查方法认为是健康的
    } catch (error) {
      return false;
    }
  }
}
