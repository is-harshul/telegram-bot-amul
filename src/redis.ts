const { createClient } = require("redis");

// Redis client configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error("❌ Redis connection failed after 10 retries");
        return new Error("Redis connection failed");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// Handle Redis connection events
redisClient.on("error", (err: Error) => {
  console.error("❌ Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redisClient.on("ready", () => {
  console.log("✅ Redis client ready");
});

redisClient.on("end", () => {
  console.log("🔌 Redis connection ended");
});

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    throw error;
  }
}

// Disconnect from Redis
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.disconnect();
  } catch (error) {
    console.error("❌ Failed to disconnect from Redis:", error);
  }
}

// Export the Redis client
export default redisClient;

// Helper functions for common Redis operations
export const redis = {
  // Set a key with optional expiration
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await redisClient.setEx(key, expireSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  },

  // Get a value by key
  async get(key: string): Promise<string | null> {
    return await redisClient.get(key);
  },

  // Delete a key
  async del(key: string): Promise<number> {
    return await redisClient.del(key);
  },

  // Check if a key exists
  async exists(key: string): Promise<number> {
    return await redisClient.exists(key);
  },

  // Set expiration for a key
  async expire(key: string, seconds: number): Promise<boolean> {
    return await redisClient.expire(key, seconds);
  },

  // Get time to live for a key
  async ttl(key: string): Promise<number> {
    return await redisClient.ttl(key);
  },

  // Increment a counter
  async incr(key: string): Promise<number> {
    return await redisClient.incr(key);
  },

  // Decrement a counter
  async decr(key: string): Promise<number> {
    return await redisClient.decr(key);
  },

  // Add to a set
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await redisClient.sAdd(key, members);
  },

  // Get all members of a set
  async smembers(key: string): Promise<string[]> {
    return await redisClient.sMembers(key);
  },

  // Remove from a set
  async srem(key: string, ...members: string[]): Promise<number> {
    return await redisClient.sRem(key, members);
  },

  // Check if member exists in set
  async sismember(key: string, member: string): Promise<boolean> {
    return await redisClient.sIsMember(key, member);
  },
};
