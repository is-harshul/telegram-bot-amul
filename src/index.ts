import { config } from "./config";
import { TelegramBot } from "./services/telegramBot";
import { DatabaseService } from "./services/databaseService";

async function main(): Promise<void> {
  try {
    console.log("🚀 Starting Amul Power of Protein Stock Monitor Bot...");

    // Initialize database
    console.log("🗄️ Initializing database connection...");
    const dbService = DatabaseService.getInstance();
    await dbService.connect();

    // Validate configuration
    if (!config.telegramToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }

    if (!config.chatId) {
      throw new Error("TELEGRAM_CHAT_ID is required");
    }

    console.log("✅ Configuration loaded successfully");
    console.log(`📱 Default Product URL: ${config.productUrl}`);
    console.log(`⏰ Check interval: ${config.checkIntervalMinutes} minutes`);
    console.log(
      `🔔 Notification cooldown: ${config.notificationCooldownMinutes} minutes`
    );

    // Check network connectivity before launching bot
    console.log("🌐 Checking network connectivity...");
    try {
      const { default: fetch } = await import("node-fetch");

      // Test both possible Telegram API endpoints
      const endpoints = [
        "https://api.telegram.org",
        "https://core.telegram.org",
      ];

      let connected = false;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "HEAD",
            timeout: 10000,
          });
          if (response.ok) {
            console.log(`✅ Network connectivity: OK (${endpoint})`);
            connected = true;
            break;
          } else {
            console.log(
              `⚠️ Network connectivity: Partial (${endpoint} - HTTP ${response.status})`
            );
            connected = true;
            break;
          }
        } catch (endpointError) {
          console.log(
            `❌ Failed to reach ${endpoint}: ${
              endpointError instanceof Error
                ? endpointError.message
                : "Unknown error"
            }`
          );
        }
      }

      if (!connected) {
        throw new Error("All Telegram API endpoints are unreachable");
      }
    } catch (error) {
      console.error("❌ Network connectivity: FAILED");
      console.error("❌ Cannot reach Telegram API endpoints");
      console.error("❌ Please check your internet connection and try again");
      console.error("❌ Error details:", error);
      process.exit(1);
    }

    // Create and launch the bot with retry mechanism
    console.log("🤖 Launching Telegram bot...");
    const bot = new TelegramBot(config);

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await bot.launch();
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`❌ Launch attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          console.error("❌ All launch attempts failed. Exiting...");
          throw error;
        }

        console.log(
          `🔄 Retrying in 5 seconds... (${retryCount}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    console.log("🎉 Bot is now running!");
    console.log("📋 Available commands:");
    console.log("  /start - Initialize the bot");
    console.log("  /products - Browse and select products to monitor");
    console.log("  /current - Show currently selected product");
    console.log("  /status - Check stock status");
    console.log("  /start_monitoring - Start automatic monitoring");
    console.log("  /stop_monitoring - Stop monitoring");
    console.log("  /addtocart - Add to cart (if configured)");
    console.log("  /help - Show detailed help");
    console.log("");
    console.log(
      "🛍️ Users can now browse the entire Amul Power of Protein collection!"
    );
    console.log(
      "🔗 Collection URL: https://shop.amul.com/en/collection/power-of-protein"
    );
  } catch (error) {
    console.error("❌ Failed to start bot:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("ENOTFOUND")) {
        console.error(
          "❌ DNS resolution failed. Check your internet connection."
        );
      } else if (error.message.includes("ECONNRESET")) {
        console.error(
          "❌ Connection was reset. This might be a temporary network issue."
        );
      } else if (error.message.includes("timeout")) {
        console.error(
          "❌ Request timed out. Check your internet connection speed."
        );
      }
    }

    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error("❌ Application error:", error);
  process.exit(1);
});
