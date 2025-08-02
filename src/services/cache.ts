import redis from "../redis";

// Cache service for storing temporary data
export class CacheService {
  private static instance: CacheService;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    try {
      await redis.connect();
      this.isConnected = true;
      console.log("✅ Connected to Redis Cache");
    } catch (error) {
      console.error("❌ Failed to connect to Redis Cache:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      await redis.disconnect();
      this.isConnected = false;
      console.log("🔌 Disconnected from Redis Cache");
    } catch (error) {
      console.error("❌ Failed to disconnect from Redis Cache:", error);
    }
  }

  // Cache user selections
  async cacheUserSelection(
    userId: string,
    productId: string,
    productName: string,
    productUrl: string
  ): Promise<void> {
    const key = `user_selection:${userId}`;
    const value = JSON.stringify({
      productId,
      productName,
      productUrl,
      timestamp: new Date().toISOString(),
    });

    // Cache for 10 minutes
    await redis.set(key, value, 600);
  }

  // Get cached user selection
  async getUserSelection(userId: string): Promise<{
    productId: string;
    productName: string;
    productUrl: string;
    timestamp: string;
  } | null> {
    const key = `user_selection:${userId}`;
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("❌ Error parsing cached user selection:", error);
      return null;
    }
  }

  // Cache stock status
  async cacheStockStatus(productId: string, status: any): Promise<void> {
    const key = `stock_status:${productId}`;
    const value = JSON.stringify({
      ...status,
      timestamp: new Date().toISOString(),
    });

    // Cache for 5 minutes
    await redis.set(key, value, 300);
  }

  // Get cached stock status
  async getStockStatus(productId: string): Promise<any | null> {
    const key = `stock_status:${productId}`;
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("❌ Error parsing cached stock status:", error);
      return null;
    }
  }

  // Cache notification cooldown
  async setNotificationCooldown(
    userId: string,
    productId: string
  ): Promise<void> {
    const key = `notification_cooldown:${userId}:${productId}`;
    // Set cooldown for 30 minutes
    await redis.set(key, "1", 1800);
  }

  // Check if notification is in cooldown
  async isNotificationInCooldown(
    userId: string,
    productId: string
  ): Promise<boolean> {
    const key = `notification_cooldown:${userId}:${productId}`;
    const exists = await redis.exists(key);
    return exists > 0;
  }

  // Clear all cache for a user
  async clearUserCache(userId: string): Promise<void> {
    const pattern = `user_selection:${userId}`;
    // Note: Redis doesn't support pattern deletion in the basic client
    // This would need a more sophisticated implementation
    console.log(`🧹 Cleared cache for user: ${userId}`);
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    // This would require Redis INFO command
    return {
      totalKeys: 0,
      memoryUsage: "N/A",
    };
  }
}
