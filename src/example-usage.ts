// Example usage of the @ alias configuration
// This file demonstrates how to use the configured path aliases

// Import using @ alias (this should work with the tsconfig.json configuration)
import redis from "@/redis";
import { CacheService } from "@/services/cache";
import { DatabaseService } from "@/services/databaseService";
import { ProductManager } from "@/services/productManager";
import { StockMonitor } from "@/services/stockMonitor";
import { TelegramBot } from "@/services/telegramBot";
import { config } from "@/config";
import { BotConfig } from "@/types";

// Example function showing how to use the aliases
export async function exampleUsage() {
  console.log("🚀 Example usage of @ alias configuration");

  // Initialize services using @ alias
  const cacheService = CacheService.getInstance();
  const dbService = DatabaseService.getInstance();
  const productManager = new ProductManager();

  // Use Redis with @ alias
  await redis.connect();
  await redis.set("test:key", "test:value", 60);
  const value = await redis.get("test:key");
  console.log("📦 Redis test value:", value);

  // Use cache service
  await cacheService.connect();
  await cacheService.cacheUserSelection(
    "123",
    "product-1",
    "Test Product",
    "https://example.com"
  );
  const selection = await cacheService.getUserSelection("123");
  console.log("📋 Cached selection:", selection);

  // Cleanup
  await redis.disconnect();
  await cacheService.disconnect();

  console.log("✅ Example usage completed");
}

// Export the example function
export default exampleUsage;
