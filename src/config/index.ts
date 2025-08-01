import dotenv from "dotenv";
import { BotConfig } from "../types";

dotenv.config();

function validateRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name];
}

export function loadConfig(): BotConfig {
  const telegramToken = validateRequiredEnvVar("TELEGRAM_BOT_TOKEN");
  const chatId = validateRequiredEnvVar("TELEGRAM_CHAT_ID");
  const productUrl = validateRequiredEnvVar("AMUL_PRODUCT_URL");

  const checkIntervalMinutes = parseInt(
    getOptionalEnvVar("CHECK_INTERVAL_MINUTES") || "5",
    10
  );
  const notificationCooldownMinutes = parseInt(
    getOptionalEnvVar("NOTIFICATION_COOLDOWN_MINUTES") || "30",
    10
  );

  return {
    telegramToken,
    chatId,
    productUrl,
    checkIntervalMinutes,
    notificationCooldownMinutes,
  };
}

export const config = loadConfig();

// Database configuration
export const dbConfig = {
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/amul-bot",
  dbName: process.env.MONGODB_DB_NAME || "amul-bot",
};
