import mongoose from "mongoose";
import { User, IUser } from "../models/User";
import { ProductTracking, IProductTracking } from "../models/ProductTracking";

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const mongoUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/amul-bot";
      await mongoose.connect(mongoUri);
      this.isConnected = true;
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("✅ Disconnected from MongoDB");
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
    }
  }

  // User Management
  async createOrUpdateUser(userData: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<IUser> {
    try {
      const user = await User.findOneAndUpdate(
        { telegramId: userData.telegramId },
        {
          $set: {
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
      return user;
    } catch (error) {
      console.error("❌ Error creating/updating user:", error);
      throw error;
    }
  }

  async getUser(telegramId: string): Promise<IUser | null> {
    try {
      return await User.findOne({ telegramId, isActive: true });
    } catch (error) {
      console.error("❌ Error getting user:", error);
      throw error;
    }
  }

  async updateUserPincode(
    telegramId: string,
    pincode: string
  ): Promise<IUser | null> {
    try {
      return await User.findOneAndUpdate(
        { telegramId },
        { $set: { pincode } },
        { new: true }
      );
    } catch (error) {
      console.error("❌ Error updating user pincode:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<IUser[]> {
    try {
      return await User.find({ isActive: true });
    } catch (error) {
      console.error("❌ Error getting all users:", error);
      throw error;
    }
  }

  // Product Tracking Management
  async createOrUpdateProductTracking(trackingData: {
    userId: string;
    productId: string;
    productName: string;
    productUrl: string;
  }): Promise<IProductTracking> {
    try {
      const tracking = await ProductTracking.findOneAndUpdate(
        { userId: trackingData.userId, productId: trackingData.productId },
        {
          $set: {
            productName: trackingData.productName,
            productUrl: trackingData.productUrl,
          },
        },
        { upsert: true, new: true }
      );
      return tracking;
    } catch (error) {
      console.error("❌ Error creating/updating product tracking:", error);
      throw error;
    }
  }

  async startTracking(userId: string, productId: string): Promise<boolean> {
    try {
      const result = await ProductTracking.findOneAndUpdate(
        { userId, productId },
        { $set: { isTracking: true } },
        { new: true }
      );
      return !!result;
    } catch (error) {
      console.error("❌ Error starting tracking:", error);
      throw error;
    }
  }

  async stopTracking(userId: string, productId: string): Promise<boolean> {
    try {
      const result = await ProductTracking.findOneAndUpdate(
        { userId, productId },
        { $set: { isTracking: false } },
        { new: true }
      );
      return !!result;
    } catch (error) {
      console.error("❌ Error stopping tracking:", error);
      throw error;
    }
  }

  async updateStockStatus(
    userId: string,
    productId: string,
    isInStock: boolean
  ): Promise<void> {
    try {
      await ProductTracking.findOneAndUpdate(
        { userId, productId },
        {
          $set: {
            lastChecked: new Date(),
            lastStockStatus: isInStock,
          },
        }
      );
    } catch (error) {
      console.error("❌ Error updating stock status:", error);
      throw error;
    }
  }

  async getActiveTracking(): Promise<IProductTracking[]> {
    try {
      return await ProductTracking.find({
        isTracking: true,
      });
    } catch (error) {
      console.error("❌ Error getting active tracking:", error);
      throw error;
    }
  }

  async getUserTracking(userId: string): Promise<IProductTracking[]> {
    try {
      return await ProductTracking.find({ userId });
    } catch (error) {
      console.error("❌ Error getting user tracking:", error);
      throw error;
    }
  }

  async getTrackingByProduct(productId: string): Promise<IProductTracking[]> {
    try {
      return await ProductTracking.find({
        productId,
        isTracking: true,
      });
    } catch (error) {
      console.error("❌ Error getting tracking by product:", error);
      throw error;
    }
  }

  // Statistics
  async getTrackingStatistics(): Promise<{
    totalUsers: number;
    activeTracking: number;
    totalTracking: number;
  }> {
    try {
      const totalUsers = await User.countDocuments({ isActive: true });
      const activeTracking = await ProductTracking.countDocuments({
        isTracking: true,
      });
      const totalTracking = await ProductTracking.countDocuments();

      return {
        totalUsers,
        activeTracking,
        totalTracking,
      };
    } catch (error) {
      console.error("❌ Error getting tracking statistics:", error);
      throw error;
    }
  }
}
