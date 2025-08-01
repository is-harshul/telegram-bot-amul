import { Telegraf, Context } from "telegraf";
import { StockMonitor } from "./stockMonitor";
import { ProductManager } from "./productManager";
import { DatabaseService } from "./databaseService";
import { PincodeValidator } from "./pincodeValidator";
import {
  BotConfig,
  StockStatus,
  NotificationSettings,
  BotCommand,
} from "../types";
import { config } from "../config";

export class TelegramBot {
  private bot: Telegraf<Context>;
  private productManager: ProductManager;
  private dbService: DatabaseService;
  private notificationSettings: NotificationSettings;
  private isMonitoring: boolean = false;
  private isRunning: boolean = false;
  private userCurrentSelection: Map<string, any> = new Map(); // Track user's current selection

  constructor(config: BotConfig) {
    // Create bot with unique session to avoid conflicts
    this.bot = new Telegraf(config.telegramToken);

    this.productManager = new ProductManager();
    this.dbService = DatabaseService.getInstance();
    this.notificationSettings = {
      enabled: true,
      cooldownMinutes: config.notificationCooldownMinutes,
    };

    this.setupCommands();
    this.setupCallbacks();
    this.setupErrorHandling();

    // Start cleanup timer for old selections (every 30 minutes)
    setInterval(() => this.cleanupOldSelections(), 30 * 60 * 1000);
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
    // Middleware to automatically register all users and check pincode
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id.toString();
      if (userId) {
        try {
          // Automatically register/update user for any interaction
          await this.dbService.createOrUpdateUser({
            telegramId: userId,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
          });

          // Check if user has pincode set
          const user = await this.dbService.getUser(userId);
          const text =
            ctx.message && "text" in ctx.message ? ctx.message.text : "";

          // Skip pincode check for pincode commands and actual pincode input
          const isPincodeCommand =
            text.startsWith("/pincode") || text.startsWith("/update_pincode");
          const isPincodeInput = /^\d{6}$/.test(text);

          if (!user?.pincode && !isPincodeCommand && !isPincodeInput) {
            // User doesn't have pincode set, ask for it
            const pincodeMessage = `
📍 <b>Delivery Pincode Required</b>

To use this bot, please set your delivery pincode first.

Please send your 6-digit pincode (e.g., 110001) so I can check stock availability for your area.

<b>🔍 Pincode Validation:</b>
• Validates with India Post API
• Shows location details (Post Office, District, State)
• Ensures accurate delivery area

This pincode will be used for:
• Stock availability checking
• Delivery location verification
• Accurate stock status for your area

<b>Commands:</b>
• /pincode - View your delivery pincode
• /update_pincode - Update your delivery pincode

💡 <i>If you find this bot helpful, use /support to contribute to its development or /connect_with_me to reach out!</i>
            `;

            await ctx.reply(pincodeMessage, { parse_mode: "HTML" });
            return; // Don't proceed with the original command
          }
        } catch (error) {
          console.error("❌ Error in middleware:", error);
        }
      }
      await next();
    });

    // Start command
    this.bot.command("start", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      // Get user info (user is already registered by middleware)
      const user = await this.dbService.getUser(userId);

      const welcomeMessage = `
🤖 <b>Welcome to Amul Power of Protein Stock Monitor!</b>

${user?.pincode ? `Your delivery pincode: <b>${user.pincode}</b>` : ""}

I'll help you monitor stock availability for Amul products and notify you when they're back in stock.

<b>Quick Actions:</b>
• /products - Browse and select products to monitor
• /mytracking - View your tracking status
• /pincode - View your delivery pincode
• /help - Show all available commands

<b>Product Collection:</b>
• <a href="https://shop.amul.com/en/collection/power-of-protein">Amul Power of Protein</a>
• Includes: Buttermilk, Milk, Curd, Paneer, Cheese, Ghee, Butter

Ready to monitor some products! 🚀

💡 <i>If you find this bot helpful, use /support to contribute to its development or /connect_with_me to reach out!</i>
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

        // Get user's tracking from database
        const userTracking = await this.dbService.getUserTracking(userId);
        if (userTracking.length === 0) {
          await ctx.reply(
            "❌ No product selected. Use /products to browse and select a product first."
          );
          return;
        }

        // Try to use the current selection first, otherwise use the last tracked product
        let tracking = userTracking[userTracking.length - 1]; // Default to last tracked

        // Check if user has a current selection (from recent product selection)
        const currentSelection = this.userCurrentSelection.get(userId);
        if (currentSelection) {
          // Use the current selection if it's recent (within last 10 minutes)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          if (currentSelection.timestamp > tenMinutesAgo) {
            // Find the tracking entry for this product
            const currentTracking = userTracking.find(
              (t) => t.productId === currentSelection.productId
            );
            if (currentTracking) {
              tracking = currentTracking;
            }
          } else {
            // Remove old selection from memory
            this.userCurrentSelection.delete(userId);
          }
        }

        await ctx.reply("🔍 Checking stock status...");

        try {
          console.log(`🔍 Starting stock check for: ${tracking.productUrl}`);

          // Get user's pincode for stock checking
          const user = await this.dbService.getUser(userId);
          const userPincode = user?.pincode;

          // Create a new stock monitor for the selected product with user's pincode
          const monitor = new StockMonitor(tracking.productUrl, userPincode);
          console.log(
            `📊 Stock monitor created with pincode: ${
              userPincode || "135001"
            }, checking stock...`
          );
          const status = await monitor.checkStock();
          console.log("📊 Stock check result:", status);
          const message = this.formatStockStatus(
            status,
            tracking.productName,
            userPincode || "135001"
          );
          await ctx.reply(message, { parse_mode: "HTML" });

          // Update last checked time in database
          await this.dbService.updateStockStatus(
            userId,
            tracking.productId,
            status.isInStock
          );
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

      try {
        const userTracking = await this.dbService.getUserTracking(userId);
        if (userTracking.length === 0) {
          await ctx.reply(
            "❌ No product selected. Use /products to browse and select a product first."
          );
          return;
        }

        const tracking = userTracking[0];
        const message = `
📦 <b>Currently Selected Product</b>

<b>${tracking.productName}</b>
🔗 <a href="${tracking.productUrl}">View Product</a>

<b>Tracking Status:</b>
• Monitoring: ${tracking.isTracking ? "🟢 Active" : "🔴 Inactive"}
• Last Checked: ${
          tracking.lastChecked
            ? new Date(tracking.lastChecked).toLocaleString()
            : "Never"
        }

Use /mytracking to view all your tracked products.
        `;

        await ctx.reply(message, { parse_mode: "HTML" });
      } catch (error) {
        console.error("❌ Error in current command:", error);
        await ctx.reply("❌ Error getting current product. Please try again.");
      }
    });

    // Start monitoring command
    this.bot.command("start_monitoring", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      try {
        const userTracking = await this.dbService.getUserTracking(userId);

        if (userTracking.length === 0) {
          await ctx.reply(
            "❌ No product selected. Use /products to browse and select a product first."
          );
          return;
        }

        // Check how many products are not currently tracking
        const inactiveTracking = userTracking.filter((t) => !t.isTracking);

        if (inactiveTracking.length === 0) {
          await ctx.reply(
            "ℹ️ Monitoring is already active for all your selected products.\n\nUse /mytracking to view your tracking status."
          );
          return;
        }

        // Start monitoring for all inactive products
        let productName = "";
        let productUrl = "";
        for (const tracking of inactiveTracking) {
          await this.dbService.startTracking(userId, tracking.productId);
          productName = tracking.productName;
          productUrl = tracking.productUrl;
        }

        await ctx.reply(
          `✅ Stock monitoring started for <a href="${productUrl}">${productName}</a>!\n\nI'll notify you when products come back in stock.\n\nUse /stop_monitoring to stop monitoring.\nUse /mytracking to view your tracking status.`,
          { parse_mode: "HTML" }
        );
      } catch (error) {
        console.error("❌ Error starting monitoring:", error);
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

      try {
        const userTracking = await this.dbService.getUserTracking(userId);
        const activeTracking = userTracking.filter((t) => t.isTracking);

        if (activeTracking.length === 0) {
          await ctx.reply("❌ No monitoring was active for your account.");
          return;
        }

        // Stop monitoring for all user's products
        let stoppedCount = 0;
        for (const tracking of activeTracking) {
          await this.dbService.stopTracking(userId, tracking.productId);
          stoppedCount++;
        }

        await ctx.reply(
          `⏹️ Stock monitoring stopped for ${stoppedCount} product(s).\n\nUse /start_monitoring to start monitoring again.\nUse /mytracking to view your tracking status.`
        );
      } catch (error) {
        console.error("❌ Error stopping monitoring:", error);
        await ctx.reply("❌ Failed to stop monitoring. Please try again.");
      }
    });

    // Pincode management commands
    this.bot.command("pincode", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const user = await this.dbService.getUser(userId);
      const currentPincode = user?.pincode;

      let message = `
📍 <b>Pincode Management</b>

${
  currentPincode
    ? `Current Pincode: <b>${currentPincode}</b>`
    : "No pincode set"
}

To update your pincode, send a message with your 6-digit pincode.
Example: <code>110001</code>

This pincode will be used for stock checking and delivery location.
      `;

      // If user has a pincode, validate and show location info
      if (currentPincode) {
        try {
          await ctx.reply("🔍 Validating current pincode...");
          const pincodeInfo = await PincodeValidator.validatePincode(
            currentPincode
          );
          const locationInfo = PincodeValidator.formatPincodeInfo(pincodeInfo);

          message += `\n\n${locationInfo}`;
        } catch (error) {
          console.error("❌ Error validating current pincode:", error);
          message += "\n\n⚠️ Unable to validate pincode at the moment.";
        }
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    });

    this.bot.command("mytracking", async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply("❌ Unable to identify user.");
        return;
      }

      const userTracking = await this.dbService.getUserTracking(userId);

      if (userTracking.length === 0) {
        await ctx.reply(
          "❌ You're not tracking any products. Use /products to browse and select products to track."
        );
        return;
      }

      const trackingList = userTracking
        .map((tracking) => {
          const status = tracking.isTracking ? "🟢 Active" : "🔴 Inactive";
          return `• <b>${tracking.productName}</b>\n Tracking Status: ${status}`;
        })
        .join("\n\n");

      const message = `
📊 <b>Your Product Tracking</b>

${trackingList}

Use /start_monitoring to activate tracking for a product.
Use /stop_monitoring to stop tracking.
      `;

      // Create inline keyboard with individual stop buttons for active tracking
      const activeTracking = userTracking.filter((t) => t.isTracking);
      const keyboard = {
        inline_keyboard: activeTracking.map((tracking) => [
          {
            text: `⏹️ Stop tracking ${tracking.productName}`,
            callback_data: `stop_tracking_${tracking.productId}`,
          },
        ]),
      };

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
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
• /mytracking - Show your tracking status
• /pincode - View your delivery pincode
• /update_pincode - Update your delivery pincode
• /catalog_status - Show product catalog information
• /refresh_catalog - Update catalog from website
• /support - Support the bot development
• /connect-with-me - Connect with me on Telegram
• /help - Show this help message

<b>Features:</b>
• Browse all Amul Power of Protein products
• Real-time stock monitoring for any product
• Automatic notifications when product is back in stock
• Pincode-based stock checking
• Cooldown system to prevent spam notifications
• Live product catalog updates from website

<b>How to Use:</b>
1. Use /pincode to set your delivery pincode
2. Use /products to browse and select a product
3. Use /status to check current stock status
4. Use /start_monitoring to begin automatic monitoring
5. You'll receive notifications when the product comes back in stock
6. Use /stop_monitoring to stop monitoring
7. Use /mytracking to view your tracking status

<b>Product Collection:</b>
• <a href="https://shop.amul.com/en/collection/power-of-protein">Amul Power of Protein</a>
• Includes: Buttermilk, Milk, Curd, Paneer, Cheese, Ghee, Butter
      `;

      await ctx.reply(helpMessage, { parse_mode: "HTML" });
    });

    // Support command
    this.bot.command("support", async (ctx) => {
      const supportMessage = `
☕ <b>Support the Bot Development</b>

Thank you for using the Amul Stock Monitor Bot! 🚀

If you find this bot helpful, please consider supporting its development:

<b>💳 UPI Payment (India):</b>
UPI ID: <code>harshulaggarwal@ybl</code>
Name: Harshul Kansal

<b>☕ Buy Me a Coffee:</b>
<a href="https://www.buymeacoffee.com/is.harshul">Buy Me a Coffee 🤎</a>

<b>⭐ GitHub Star:</b>
<a href="https://github.com/is-harshul/telegram-bot-amul">⭐ Star this project on GitHub</a>

<b>🔄 Server Costs:</b>
• Total: ~$10/month

<b>🎯 What Your Support Helps With:</b>
• Server hosting costs
• Database maintenance
• Feature development
• Bug fixes and improvements
• 24/7 bot availability

<b>🙏 Thank You!</b>
Every contribution helps keep this bot running and improving!

Use /help to see all available commands.
      `;

      await ctx.reply(supportMessage, { parse_mode: "HTML" });
    });

    // Connect with me command
    this.bot.command("connect_with_me", async (ctx) => {
      const connectMessage = `
👋 <b>Connect With Me</b>

Hey! I'm Harshul Kansal, the developer of this Amul Stock Monitor Bot.

<b>📱 Telegram:</b>
<a href="https://t.me/is_harshul">@is_harshul</a>

<b>💼 LinkedIn:</b>
<a href="https://www.linkedin.com/in/harshul-kansal/">Harshul Kansal</a>

<b>🐙 GitHub:</b>
<a href="https://github.com/is-harshul">@is-harshul</a>

<b>📧 Email:</b>
harshul.kansal@gmail.com

<b>💬 Let's Connect!</b>
Feel free to reach out for:
• Bot feature requests
• Bug reports
• Technical discussions
• Collaboration opportunities
• General chat

<b>🛠️ Other Projects:</b>
• <a href="https://github.com/is-harshul">GitHub Profile</a>
• <a href="https://t.me/is_harshul">Telegram Channel</a>

Looking forward to connecting with you! 🚀
      `;

      await ctx.reply(connectMessage, { parse_mode: "HTML" });
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
        try {
          const stats = await this.dbService.getTrackingStatistics();
          const allUsers = await this.dbService.getAllUsers();
          const activeTracking = await this.dbService.getActiveTracking();

          const message = `
📊 <b>User Statistics</b>

👥 Total Users: ${stats.totalUsers}
🔍 Active Tracking: ${stats.activeTracking}
📦 Total Tracking Entries: ${stats.totalTracking}

<b>Active Tracking:</b>
${
  activeTracking
    .map((tracking) => `• ${tracking.productName} (${tracking.userId})`)
    .join("\n") || "None"
}
        `;

          await ctx.reply(message, { parse_mode: "HTML" });
        } catch (error) {
          console.error("❌ Error getting user statistics:", error);
          await ctx.reply("❌ Error getting user statistics.");
        }
      } else {
        await ctx.reply("❌ You don't have permission to use this command.");
      }
    });

    // Handle pincode updates and unknown commands
    this.bot.on("text", async (ctx) => {
      const userId = ctx.from?.id.toString();
      const text = ctx.message?.text;

      if (!userId || !text) {
        await ctx.reply(
          "❓ Unknown command. Use /help to see available commands."
        );
        return;
      }

      // Check if the text is a 6-digit pincode
      const pincodeRegex = /^\d{6}$/;
      if (pincodeRegex.test(text)) {
        try {
          // Show validation in progress
          await ctx.reply("🔍 Validating pincode with India Post API...");

          // Validate pincode using India Post API
          const pincodeInfo = await PincodeValidator.validatePincode(text);

          if (!pincodeInfo.isValid) {
            const errorMessage =
              PincodeValidator.formatPincodeInfo(pincodeInfo);
            await ctx.reply(errorMessage, { parse_mode: "HTML" });

            // Additional helpful message
            await ctx.reply(
              "💡 <b>Need Help?</b>\n\n• Make sure you're entering a valid 6-digit pincode\n• You can find your pincode on any postal item or online\n• Use /pincode to view your current pincode\n• Use /help to see all available commands",
              { parse_mode: "HTML" }
            );
            return;
          }

          // Update pincode in database
          await this.dbService.updateUserPincode(userId, text);

          // Format success message with location details
          const locationInfo = PincodeValidator.formatPincodeInfo(pincodeInfo);
          const successMessage = `
✅ <b>Pincode Updated Successfully!</b>

📍 <b>Pincode:</b> <code>${text}</code>

${locationInfo}

<b>This pincode will be used for:</b>
• Stock availability checking
• Delivery location verification
• Accurate stock status for your area

<b>Next Steps:</b>
• Use /products to browse and select products
• Use /pincode to view your current pincode
• Use /help to see all available commands
          `;

          await ctx.reply(successMessage, { parse_mode: "HTML" });
        } catch (error) {
          console.error("❌ Error updating pincode:", error);
          await ctx.reply("❌ Failed to update pincode. Please try again.");
        }
      } else {
        await ctx.reply(
          "❓ Unknown command. Use /help to see available commands.\n\nTo update your pincode, send a 6-digit pincode (e.g., 110001).\n\nOr use /update_pincode for a guided update."
        );
      }
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

      try {
        // Create or update user in database
        await this.dbService.createOrUpdateUser({
          telegramId: userId,
          username: userInfo.username,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
        });

        // Create or update product tracking
        const product = this.productManager.getProductById(productId);
        if (!product) {
          await ctx.reply("❌ Product not found. Please try again.");
          return;
        }

        await this.dbService.createOrUpdateProductTracking({
          userId,
          productId,
          productName: product.name,
          productUrl: product.url,
        });

        // Store the current selection for this user
        this.userCurrentSelection.set(userId, {
          productId,
          productName: product.name,
          productUrl: product.url,
          timestamp: new Date(),
        });

        const message = `
✅ <b>Product Selected Successfully!</b>

<b>${product.name}</b>
📝 ${product.description}
🏷️ Category: ${product.category}
💰 Price: ${product.price || "Not available"}

You can now:
• Use /status to check current stock
• Use /start_monitoring to begin automatic monitoring

• Use /mytracking to view your tracking status
        `;

        await ctx.editMessageText(message, { parse_mode: "HTML" });
      } catch (error) {
        console.error("❌ Error selecting product:", error);
        await ctx.reply("❌ Failed to select product. Please try again.");
      }
    });

    // Handle individual stop tracking buttons
    this.bot.action(/^stop_tracking_(.+)$/, async (ctx) => {
      try {
        const userId = ctx.from?.id.toString();
        const productId = ctx.match[1];
        const productName = this.productManager.getProductById(productId)?.name;

        if (!userId) {
          await ctx.reply("❌ Unable to identify user.");
          return;
        }

        // Stop tracking for this specific product
        const success = await this.dbService.stopTracking(userId, productId);

        if (success) {
          await ctx.reply(
            `✅ Tracking stopped for ${productName} product successfully!`
          );
        } else {
          await ctx.reply("❌ Failed to stop tracking for this product.");
        }

        // Update the original message to remove the button
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      } catch (error) {
        console.error("❌ Error stopping tracking:", error);
        await ctx.reply("❌ Error stopping tracking. Please try again.");
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

  private formatStockStatus(
    status: StockStatus,
    productName: string,
    pincode: string
  ): string {
    const emoji = status.isInStock ? "✅" : "❌";
    const statusText = status.isInStock ? "IN STOCK" : "OUT OF STOCK";
    const price = status.price ? `\n💰 Price: ${status.price}` : "";
    const error = status.error ? `\n⚠️ Error: ${status.error}` : "";
    const time = status.lastChecked.toLocaleString();

    return `
${emoji} <b>Stock Status: ${statusText}</b>
📦 Product: ${productName}
${price}
📍 For Pincode: ${pincode}
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

        // Get all active tracking from database
        const activeTracking = await this.dbService.getActiveTracking();
        console.log(
          `📊 [Monitoring] Found ${activeTracking.length} active tracking entries`
        );

        for (const tracking of activeTracking) {
          try {
            console.log(
              `🔍 [Monitoring] Checking stock for user ${tracking.userId} (${tracking.productName})`
            );

            // Get user's pincode for stock checking
            const user = await this.dbService.getUser(tracking.userId);
            const userPincode = user?.pincode;

            const monitor = new StockMonitor(tracking.productUrl, userPincode);
            console.log(
              `📊 [Monitoring] Stock monitor created with pincode: ${
                userPincode || "default"
              }`
            );
            const status = await monitor.checkStock();

            console.log(
              `📊 [Monitoring] Stock status for ${tracking.productName}: ${
                status.isInStock ? "IN STOCK" : "OUT OF STOCK"
              }`
            );

            // Update stock status in database
            await this.dbService.updateStockStatus(
              tracking.userId,
              tracking.productId,
              status.isInStock
            );

            // If product is back in stock and wasn't in stock before, send notification
            if (
              status.isInStock &&
              tracking.lastStockStatus === false &&
              this.shouldSendNotification()
            ) {
              console.log(
                `🎉 [Monitoring] Product is back in stock! Notifying user ${tracking.userId}`
              );

              // Get user info for notification
              const user = await this.dbService.getUser(tracking.userId);
              const userInfo = {
                ...user,
                username: user?.username,
                firstName: user?.firstName,
                lastName: user?.lastName,
              };

              await this.sendStockNotification(
                status,
                {
                  userId: tracking.userId,
                  productName: tracking.productName,
                  productUrl: tracking.productUrl,
                  ...userInfo,
                },
                tracking.userId,
                user?.pincode || "135001"
              );
              this.updateLastNotification();
            }
          } catch (error) {
            console.error(
              `❌ [Monitoring] Error checking stock for user ${tracking.userId}:`,
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
    userId: string,
    pincode: string
  ): Promise<void> {
    const message = `
🎉 <b>PRODUCT IS BACK IN STOCK!</b>

${this.formatStockStatus(status, selection.productName, pincode)}

🛒 <b>Quick Actions:</b>

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

  private cleanupOldSelections(): void {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    let cleanedCount = 0;

    for (const [userId, selection] of this.userCurrentSelection.entries()) {
      if (selection.timestamp < tenMinutesAgo) {
        this.userCurrentSelection.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old user selections`);
    }
  }
}
