import mongoose, { Document, Schema } from "mongoose";

export interface IProductTracking extends Document {
  userId: string; // Reference to User.telegramId
  productId: string;
  productName: string;
  productUrl: string;
  isTracking: boolean;
  notificationEnabled: boolean;
  lastChecked?: Date;
  lastStockStatus?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductTrackingSchema = new Schema<IProductTracking>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productUrl: {
      type: String,
      required: true,
    },
    isTracking: {
      type: Boolean,
      default: false,
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    lastChecked: {
      type: Date,
      default: null,
    },
    lastStockStatus: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one tracking entry per user per product
ProductTrackingSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const ProductTracking = mongoose.model<IProductTracking>(
  "ProductTracking",
  ProductTrackingSchema
);
