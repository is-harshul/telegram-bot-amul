import { Telegraf, Context } from "telegraf";
import { StockMonitor } from "./stockMonitor";
import { CartAutomation } from "./cartAutomation";
import { ProductManager } from "./productManager";
import {
  BotConfig,
  StockStatus,
  NotificationSettings,
  BotCommand,
} from "../types";
import { config } from "../config";

export class TelegramBot {
  private bot: Telegraf<Context>;
  private stockMonitor: StockMonitor;
  private cartAutomation?: CartAutomation;
  private productManager: ProductManager;
  private notificationSettings: NotificationSettings;
  private isMonitoring: boolean = false;
  private isRunning: boolean = false;

  constructor(config: BotConfig) {
    // Create bot with unique session to avoid conflicts
    this.bot = new Telegraf(config.telegramToken);

    this.stockMonitor = new StockMonitor(config.productUrl);
    this.productManager = new ProductManager();
    this.notificationSettings = {
      enabled: true,
      cooldownMinutes: config.notificationCooldownMinutes,
    };

    if (config.amulCredentials) {
      this.cartAutomation = new CartAutomation(
        config.amulCredentials,
        config.productUrl
      );
    }

    this.setupCommands();
    this.setupCallbacks();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Handle bot errors
    this.bot.catch((err, ctx) => {
      console.error("❌ Bot error:", err);
      console.error("❌ Context:", ctx);

      // Try to send error message to user if possible
      try {
        ctx
          .reply(
            "❌ An error occurred while processing your request. Please try again later."
          )
          .catch(console.error);
      } catch (replyError) {
        console.error("❌ Failed to send error message:", replyError);
      }
    });

    // Handle unhandled bot errors
    this.bot.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error("❌ Unhandled bot error:", error);
        try {
          await ctx.reply(
            "❌ An unexpected error occurred. Please try again later."
          );
        } catch (replyError) {
          console.error("❌ Failed to send error message:", replyError);
        }
      }
    });
  }

  private setupCommands(): void {
    // Start command
    this.bot.command("start", async (ctx) => {
      const welcomeMessage = `
🚀 <b>Amul Power of Protein Stock Monitor Bot</b>

Welcome! I'll help you monitor any product from Amul's Power of Protein collection.

<b>Available Commands:</b>
/products - Browse and select products to monitor
/status - Check current stock status
/start_monitoring - Start automatic monitoring
/stop_monitoring - Stop automatic monitoring
/addtocart - Add product to cart (if logged in)
/catalog_status - Show product catalog info
/refresh_catalog - Update catalog from website
/help - Show detailed help

<b>Collection:</b> <a href="https://shop.amul.com/en/collection/power-of-protein">Amul Power of Protein</a>

${
  this.cartAutomation
    ? "✅ Cart automation enabled"
    : "❌ Cart automation not configured"
}

Use /products to start browsing and select a product to monitor!
Use /refresh_catalog to get the latest products from the website.
      `;

      await ctx.reply(welcomeMessage, { parse_mode: "HTML" });

      // Start the monitoring service if it's not already running
      if (!this.isMonitoring) {
        this.startMonitoringLoop();
        console.log("🔄 [Start] Monitoring service started for new user");
      }
    });

    // Products command
    this.bot.command("products", async (ctx) => {
      const message = `
🛍️ <b>Browse Amul Power of Protein Products</b>

Select a category to view available products:

${this.productManager.formatCategoryList()}

Use the buttons below to browse by category:
      `;

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: this.productManager.getProductSelectionKeyboard(),
      });
    });

    // Status command
    this.bot.command("status", async (ctx) => {
      try {
        const userId = ctx.from?.id.toString();
        if (!userId) {
          await ctx.reply("❌ Unable to identify user.");
          return;
        }

        const selection = this.productManager.getUserProduct(userId);
        if (!selection) {
          await ctx.reply(
            "❌ No product selected. Use /products to browse and select a product first."
          );
          return;
        }

        await ctx.reply("🔍 Checking stock status...");

        try {
          console.log(`🔍 Starting stock check for: ${selection.productUrl}`);
          // Create a new stock monitor for the selected product
          const monitor = new StockMonitor(selection.productUrl);
          console.log("📊 Stock monitor created, checking stock...");
          const status = await monitor.checkStock();
          console.log("📊 Stock check result:", status);
          const message = this.formatStockStatus(status, selection.productName);
          await ctx.reply(message, { parse_mode: "HTML" });

          // Update last checked time
          this.productManager.updateUserProductLastChecked(userId);
        } catch (error) {
          console.error("❌ Error in stock check:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await ctx.reply(
            `❌ Error checking stock: ${errorMessage}\n\nPlease try again later or contact support if the issue persists.`
          );
        }
      } catch (error) {
        console.error("❌ Error in status command:", error);
        try {
          await ctx.reply(
            "❌ An error occurred while processing your request. Please try again."
          );
        } catch (replyError) {
          console.error("❌ Failed to send error message:", replyError);
        }
      }
    });

    // Current product command
    this.bot.command("current", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const message = this.productManager.formatUserSelection(userId);
      await ctx.reply(message, { parse_mode: "HTML" });
    });

    // Start monitoring command
    this.bot.command("start_monitoring", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const selection = this.productManager.getUserProduct(userId);
      if (!selection) {
        await ctx.reply(
          "❌ No product selected. Use /products to browse and select a product first."
        );
        return;
      }

      // Start monitoring for this specific user
      const success = this.productManager.startMonitoring(userId);
      if (success) {
        await ctx.reply(
          `✅ Stock monitoring started for <b>${selection.productName}</b>!\n\nI'll notify you when the product is back in stock.\n\nUse /stop_monitoring to stop monitoring.`,
          { parse_mode: "HTML" }
        );
      } else {
        await ctx.reply("❌ Failed to start monitoring. Please try again.");
      }
    });

    // Stop monitoring command
    this.bot.command("stop_monitoring", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const success = this.productManager.stopMonitoring(userId);
      if (success) {
        await ctx.reply(
          "⏹️ Stock monitoring stopped for your selected product."
        );
      } else {
        await ctx.reply("❌ No monitoring was active for your account.");
      }
    });

    // Add to cart command
    this.bot.command("addtocart", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const selection = this.productManager.getUserProduct(userId);
      if (!selection) {
        await ctx.reply(
          "❌ No product selected. Use /products to browse and select a product first."
        );
        return;
      }

      if (!this.cartAutomation) {
        await ctx.reply(
          "❌ Cart automation is not configured. Please set up your Amul credentials in the environment variables."
        );
        return;
      }

      await ctx.reply("🛒 Attempting to add product to cart...");

      try {
        // Create a new cart automation for the selected product
        const cart = new CartAutomation(
          this.cartAutomation["credentials"],
          selection.productUrl
        );
        const result = await cart.addToCart();
        const message = result.success
          ? `✅ ${result.message}\n${
              result.cartUrl ? `Cart URL: ${result.cartUrl}` : ""
            }`
          : `❌ ${result.message}`;

        await ctx.reply(message);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (
          errorMessage.includes("OTP") ||
          errorMessage.includes("verification")
        ) {
          await ctx.reply(
            `❌ Authentication required: ${errorMessage}\n\n💡 The cart automation requires mobile OTP verification and possibly PIN code entry. Please complete the login process manually on the Amul website.`
          );
        } else if (
          errorMessage.includes("PIN") ||
          errorMessage.includes("pincode")
        ) {
          await ctx.reply(
            `❌ PIN verification required: ${errorMessage}\n\n💡 Please enter your PIN code on the Amul website to complete the authentication.`
          );
        } else {
          await ctx.reply(`❌ Error adding to cart: ${errorMessage}`);
        }
      }
    });

    // Help command
    this.bot.command("help", async (ctx) => {
      const helpMessage = `
📖 <b>Detailed Help</b>

<b>Commands:</b>
• /start - Initialize the bot and show welcome message
• /products - Browse and select products to monitor
• /current - Show currently selected product
• /status - Check current stock status manually
• /start_monitoring - Start automatic stock monitoring
• /stop_monitoring - Stop automatic monitoring
• /addtocart - Automatically add product to your Amul cart
• /catalog_status - Show product catalog information
• /refresh_catalog - Update product catalog from website
• /help - Show this help message

<b>Features:</b>
• Browse all Amul Power of Protein products
• Real-time stock monitoring for any product
• Automatic notifications when product is back in stock
• Cart automation (requires Amul account credentials)
• Cooldown system to prevent spam notifications
• Live product catalog updates from website

<b>How to Use:</b>
1. Use /products to browse and select a product
2. Use /status to check current stock status
3. Use /start_monitoring to begin automatic monitoring
4. You'll receive notifications when the product comes back in stock
5. Use /stop_monitoring to stop monitoring

<b>Product Collection:</b>
• <a href="https://shop.amul.com/en/collection/power-of-protein">Amul Power of Protein</a>
• Includes: Buttermilk, Milk, Curd, Paneer, Cheese, Ghee, Butter
      `;

      await ctx.reply(helpMessage, { parse_mode: "HTML" });
    });

    // Catalog status command
    this.bot.command("catalog_status", async (ctx) => {
      const message = this.productManager.formatCatalogStatus();
      await ctx.reply(message, { parse_mode: "HTML" });
    });

    // Refresh catalog command
    this.bot.command("refresh_catalog", async (ctx) => {
      console.log("[Telegram] /refresh_catalog command received");
      await ctx.reply(
        "🔄 Refreshing product catalog from Amul website... This may take a few minutes."
      );
      console.log("[Telegram] Sent initial reply");
      try {
        const result = await this.productManager.refreshCatalog();
        console.log("[Telegram] refreshCatalog result:", result);
        await ctx.reply(result.message, { parse_mode: "HTML" });
        console.log("[Telegram] Sent result message");
        if (result.success) {
          const statusMessage = this.productManager.formatCatalogStatus();
          await ctx.reply(statusMessage, { parse_mode: "HTML" });
          console.log("[Telegram] Sent catalog status");
        }
      } catch (error) {
        console.error("[Telegram] Error in /refresh_catalog:", error);
        await ctx.reply(
          `❌ Error refreshing catalog: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    // Admin commands (only for bot owner)
    this.bot.command("start_monitoring_service", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      // Check if this is the bot owner (you can customize this check)
      if (userId === config.chatId) {
        this.startMonitoringLoop();
        await ctx.reply("✅ Monitoring service started for all users!");
      } else {
        await ctx.reply("❌ You don't have permission to use this command.");
      }
    });

    this.bot.command("users", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      // Check if this is the bot owner
      if (userId === config.chatId) {
        const allUsers = this.productManager.getAllUsers();
        const monitoringUsers = this.productManager.getMonitoringUsers();

        const message = `
📊 <b>User Statistics</b>

👥 Total Users: ${allUsers.length}
🔍 Monitoring Users: ${monitoringUsers.length}

<b>Monitoring Users:</b>
${
  monitoringUsers
    .map(
      (user) =>
        `• ${user.username || user.firstName || "Unknown"} (${
          user.productName
        })`
    )
    .join("\n") || "None"
}
        `;

        await ctx.reply(message, { parse_mode: "HTML" });
      } else {
        await ctx.reply("❌ You don't have permission to use this command.");
      }
    });

    // Handle unknown commands
    this.bot.on("text", async (ctx) => {
      await ctx.reply(
        "❓ Unknown command. Use /help to see available commands."
      );
    });
  }

  private setupCallbacks(): void {
    // Handle category selection
    this.bot.action(/^category_(.+)$/, async (ctx) => {
      try {
        console.log(`[Telegram] Category selection: ${ctx.match[1]}`);
        const category = ctx.match[1];
        const products = this.productManager.getProductsByCategory(category);
        console.log(
          `[Telegram] Found ${products.length} products for category: ${category}`
        );

        const formattedList = this.productManager.formatProductList(
          products,
          1,
          10
        );
        const message = `
🛍️ <b>${category} Products</b>

${formattedList.text}

Select a product to monitor:
        `;

        const keyboard = this.productManager.getProductsKeyboard(
          category,
          1,
          10
        );
        console.log(
          `[Telegram] Created keyboard with ${keyboard.inline_keyboard.length} buttons`
        );

        await ctx.editMessageText(message, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        console.log(
          `[Telegram] Successfully sent category products for: ${category}`
        );
      } catch (error) {
        console.error("[Telegram] Error in category selection:", error);
        await ctx.reply(
          `❌ Error loading products for category: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    // Handle category pagination
    this.bot.action(/^category_page_(.+)_(\d+)$/, async (ctx) => {
      try {
        const category = ctx.match[1];
        const page = parseInt(ctx.match[2]);
        console.log(
          `[Telegram] Category pagination: ${category}, page ${page}`
        );

        const products = this.productManager.getProductsByCategory(category);
        const formattedList = this.productManager.formatProductList(
          products,
          page,
          10
        );

        const message = `
🛍️ <b>${category} Products</b>

${formattedList.text}

Select a product to monitor:
        `;

        const keyboard = this.productManager.getProductsKeyboard(
          category,
          page,
          10
        );

        await ctx.editMessageText(message, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        console.log(
          `[Telegram] Successfully sent category page ${page} for: ${category}`
        );
      } catch (error) {
        console.error("[Telegram] Error in category pagination:", error);
        await ctx.reply(
          `❌ Error loading page: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    // Handle product selection
    this.bot.action(/^product_(.+)$/, async (ctx) => {
      const productId = ctx.match[1];
      const userId = ctx.from?.id.toString();

      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      // Get user information
      const userInfo = {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
      };

      const success = this.productManager.setUserProduct(
        userId,
        productId,
        userInfo
      );
      if (success) {
        const product = this.productManager.getProductById(productId);
        const message = `
✅ <b>Product Selected Successfully!</b>

<b>${product?.name}</b>
📝 ${product?.description}
🏷️ Category: ${product?.category}
💰 Price: ${product?.price || "Not available"}

You can now:
• Use /status to check current stock
• Use /start_monitoring to begin automatic monitoring
• Use /addtocart to add to cart (if configured)
        `;

        await ctx.editMessageText(message, { parse_mode: "HTML" });
      } else {
        await ctx.reply("❌ Failed to select product. Please try again.");
      }
    });

    // Handle back to categories
    this.bot.action("back_to_categories", async (ctx) => {
      const message = `
🛍️ <b>Browse Amul Power of Protein Products</b>

Select a category to view available products:

${this.productManager.formatCategoryList()}

Use the buttons below to browse by category:
      `;

      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: this.productManager.getProductSelectionKeyboard(),
      });
    });
  }

  private formatStockStatus(status: StockStatus, productName: string): string {
    const emoji = status.isInStock ? "✅" : "❌";
    const statusText = status.isInStock ? "IN STOCK" : "OUT OF STOCK";
    const price = status.price ? `\n💰 Price: ${status.price}` : "";
    const error = status.error ? `\n⚠️ Error: ${status.error}` : "";
    const time = status.lastChecked.toLocaleString();

    return `
${emoji} <b>Stock Status: ${statusText}</b>
📦 Product: ${productName}
${price}
🕒 Last checked: ${time}
${error}
    `.trim();
  }

  private async startMonitoringLoop(): Promise<void> {
    const checkInterval = 5 * 60 * 1000; // 5 minutes

    const monitor = async () => {
      try {
        console.log(
          "🔍 [Monitoring] Starting stock check for all monitoring users..."
        );

        // Get all users who are monitoring
        const monitoringUsers = this.productManager.getMonitoringUsers();
        console.log(
          `📊 [Monitoring] Found ${monitoringUsers.length} users monitoring products`
        );

        for (const userSelection of monitoringUsers) {
          try {
            console.log(
              `🔍 [Monitoring] Checking stock for user ${
                userSelection.userId
              } (${userSelection.username || "Unknown"})`
            );

            const monitor = new StockMonitor(userSelection.productUrl);
            const status = await monitor.checkStock();

            console.log(
              `📊 [Monitoring] Stock status for ${userSelection.productName}: ${
                status.isInStock ? "IN STOCK" : "OUT OF STOCK"
              }`
            );

            // If product is back in stock, send notification
            if (status.isInStock && this.shouldSendNotification()) {
              console.log(
                `🎉 [Monitoring] Product is back in stock! Notifying user ${userSelection.userId}`
              );
              await this.sendStockNotification(
                status,
                userSelection,
                userSelection.userId
              );
              this.updateLastNotification();
            }
          } catch (error) {
            console.error(
              `❌ [Monitoring] Error checking stock for user ${userSelection.userId}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("❌ [Monitoring] Error in monitoring loop:", error);
      }

      // Schedule next check
      setTimeout(monitor, checkInterval);
    };

    // Start the first check
    monitor();
  }

  private shouldSendNotification(): boolean {
    if (!this.notificationSettings.enabled) return false;

    if (!this.notificationSettings.lastNotification) return true;

    const cooldownMs = this.notificationSettings.cooldownMinutes * 60 * 1000;
    const timeSinceLastNotification =
      Date.now() - this.notificationSettings.lastNotification.getTime();

    return timeSinceLastNotification >= cooldownMs;
  }

  private updateLastNotification(): void {
    this.notificationSettings.lastNotification = new Date();
  }

  private async sendStockNotification(
    status: StockStatus,
    selection: any,
    userId: string
  ): Promise<void> {
    const message = `
🎉 <b>PRODUCT IS BACK IN STOCK!</b>

${this.formatStockStatus(status, selection.productName)}

🛒 <b>Quick Actions:</b>
• Use /addtocart to automatically add to your cart
• Visit: ${selection.productUrl}

⏰ <b>Notification Settings:</b>
• Cooldown: ${this.notificationSettings.cooldownMinutes} minutes
• Use /stop_monitoring to stop notifications
    `;

    try {
      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  async launch(): Promise<void> {
    try {
      console.log("🚀 Attempting to launch Telegram bot...");

      // Clear any existing webhook first
      try {
        await this.bot.telegram.deleteWebhook();
        console.log("✅ Cleared existing webhook");
      } catch (error) {
        console.log("ℹ️ No webhook to clear or error clearing webhook:", error);
      }

      // Launch the bot without timeout to see actual errors
      await this.bot.launch();

      this.isRunning = true;
      console.log("🤖 Telegram bot started successfully!");

      // Graceful stop
      process.once("SIGINT", () => this.stop());
      process.once("SIGTERM", () => this.stop());

      // Note: Telegraf handles reconnection automatically
      console.log("📡 Bot is ready to receive messages");

      // Start the monitoring service
      this.startMonitoringLoop();
      console.log("🔄 [Launch] Monitoring service started for all users");
    } catch (error) {
      console.error("❌ Error launching bot:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (
          error.message.includes("409") ||
          error.message.includes("Conflict")
        ) {
          console.error("❌ Bot instance conflict detected!");
          console.error("❌ Another bot instance is already running.");
          console.error(
            "💡 Solution: Stop all other bot instances and try again."
          );
          console.error(
            "💡 You can use: pkill -f 'ts-node' && pkill -f 'node.*index'"
          );
        } else if (
          error.message.includes("ENOTFOUND") ||
          error.message.includes("ECONNRESET")
        ) {
          console.error(
            "❌ Network connectivity issue. Please check your internet connection."
          );
          console.error("❌ Make sure you can reach api.telegram.org");
        } else if (error.message.includes("timeout")) {
          console.error(
            "❌ Bot launch timed out. Check your internet connection."
          );
        } else {
          console.error("❌ Unknown error during bot launch");
        }
      }

      throw error;
    }
  }

  private async handleReconnection(): Promise<void> {
    if (!this.isRunning) return;

    console.log("🔄 Attempting to reconnect to Telegram...");

    try {
      await this.bot.stop();
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      await this.bot.launch();
      console.log("✅ Successfully reconnected to Telegram");
    } catch (error) {
      console.error("❌ Failed to reconnect:", error);
      // Try again in 30 seconds
      setTimeout(() => this.handleReconnection(), 30000);
    }
  }

  stop(): void {
    this.isRunning = false;
    this.isMonitoring = false;
    this.bot.stop();
    console.log("🛑 Bot stopped");
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const { default: fetch } = await import("node-fetch");
      const response = await fetch("https://api.telegram.org", {
        method: "HEAD",
        timeout: 10000,
      });
      return response.ok;
    } catch (error) {
      console.error("❌ Network connectivity check failed:", error);
      return false;
    }
  }
}
