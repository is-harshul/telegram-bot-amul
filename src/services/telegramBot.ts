import { Telegraf, Context } from 'telegraf';
import { StockMonitor } from './stockMonitor';
import { CartAutomation } from './cartAutomation';
import { ProductManager } from './productManager';
import { BotConfig, StockStatus, NotificationSettings, BotCommand } from '../types';

export class TelegramBot {
  private bot: Telegraf<Context>;
  private stockMonitor: StockMonitor;
  private cartAutomation?: CartAutomation;
  private productManager: ProductManager;
  private notificationSettings: NotificationSettings;
  private isMonitoring: boolean = false;

  constructor(config: BotConfig) {
    this.bot = new Telegraf(config.telegramToken);
    this.stockMonitor = new StockMonitor(config.productUrl);
    this.productManager = new ProductManager();
    this.notificationSettings = {
      enabled: true,
      cooldownMinutes: config.notificationCooldownMinutes
    };

    if (config.amulCredentials) {
      this.cartAutomation = new CartAutomation(config.amulCredentials, config.productUrl);
    }

    this.setupCommands();
    this.setupCallbacks();
  }

  private setupCommands(): void {
    // Start command
    this.bot.command('start', async (ctx) => {
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

${this.cartAutomation ? '✅ Cart automation enabled' : '❌ Cart automation not configured'}

Use /products to start browsing and select a product to monitor!
Use /refresh_catalog to get the latest products from the website.
      `;
      
      await ctx.reply(welcomeMessage, { parse_mode: 'HTML' });
    });

    // Products command
    this.bot.command('products', async (ctx) => {
      const message = `
🛍️ <b>Browse Amul Power of Protein Products</b>

Select a category to view available products:

${this.productManager.formatCategoryList()}

Use the buttons below to browse by category:
      `;
      
      await ctx.reply(message, { 
        parse_mode: 'HTML',
        reply_markup: this.productManager.getProductSelectionKeyboard()
      });
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply('❌ Unable to identify user.');
        return;
      }

      const selection = this.productManager.getUserProduct(userId);
      if (!selection) {
        await ctx.reply('❌ No product selected. Use /products to browse and select a product first.');
        return;
      }

      await ctx.reply('🔍 Checking stock status...');
      
      try {
        // Create a new stock monitor for the selected product
        const monitor = new StockMonitor(selection.productUrl);
        const status = await monitor.checkStock();
        const message = this.formatStockStatus(status, selection.productName);
        await ctx.reply(message, { parse_mode: 'HTML' });
        
        // Update last checked time
        this.productManager.updateUserProductLastChecked(userId);
      } catch (error) {
        await ctx.reply(`❌ Error checking stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Current product command
    this.bot.command('current', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply('❌ Unable to identify user.');
        return;
      }

      const message = this.productManager.formatUserSelection(userId);
      await ctx.reply(message, { parse_mode: 'HTML' });
    });

    // Start monitoring command
    this.bot.command('start_monitoring', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply('❌ Unable to identify user.');
        return;
      }

      const selection = this.productManager.getUserProduct(userId);
      if (!selection) {
        await ctx.reply('❌ No product selected. Use /products to browse and select a product first.');
        return;
      }

      if (this.isMonitoring) {
        await ctx.reply('⚠️ Monitoring is already active!');
        return;
      }

      this.isMonitoring = true;
      await ctx.reply(`✅ Stock monitoring started for <b>${selection.productName}</b>! I'll notify you when the product is back in stock.`, { parse_mode: 'HTML' });
      
      // Start the monitoring loop
      this.startMonitoringLoop();
    });

    // Stop monitoring command
    this.bot.command('stop_monitoring', async (ctx) => {
      this.isMonitoring = false;
      await ctx.reply('⏹️ Stock monitoring stopped.');
    });

    // Add to cart command
    this.bot.command('addtocart', async (ctx) => {
      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply('❌ Unable to identify user.');
        return;
      }

      const selection = this.productManager.getUserProduct(userId);
      if (!selection) {
        await ctx.reply('❌ No product selected. Use /products to browse and select a product first.');
        return;
      }

      if (!this.cartAutomation) {
        await ctx.reply('❌ Cart automation is not configured. Please set up your Amul credentials in the environment variables.');
        return;
      }

      await ctx.reply('🛒 Attempting to add product to cart...');
      
      try {
        // Create a new cart automation for the selected product
        const cart = new CartAutomation(this.cartAutomation['credentials'], selection.productUrl);
        const result = await cart.addToCart();
        const message = result.success 
          ? `✅ ${result.message}\n${result.cartUrl ? `Cart URL: ${result.cartUrl}` : ''}`
          : `❌ ${result.message}`;
        
        await ctx.reply(message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('OTP') || errorMessage.includes('verification')) {
          await ctx.reply(`❌ Authentication required: ${errorMessage}\n\n💡 The cart automation requires mobile OTP verification and possibly PIN code entry. Please complete the login process manually on the Amul website.`);
        } else if (errorMessage.includes('PIN') || errorMessage.includes('pincode')) {
          await ctx.reply(`❌ PIN verification required: ${errorMessage}\n\n💡 Please enter your PIN code on the Amul website to complete the authentication.`);
        } else {
          await ctx.reply(`❌ Error adding to cart: ${errorMessage}`);
        }
      }
    });

    // Help command
    this.bot.command('help', async (ctx) => {
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

<b>Setup:</b>
1. Set your Telegram bot token in TELEGRAM_BOT_TOKEN
2. Set your chat ID in TELEGRAM_CHAT_ID
3. Optionally set Amul credentials for cart automation
4. Use /products to select a product to monitor
5. Use /start_monitoring to begin monitoring

<b>Product Collection:</b>
• <a href="https://shop.amul.com/en/collection/power-of-protein">Amul Power of Protein</a>
• Includes: Buttermilk, Milk, Curd, Paneer, Cheese, Ghee, Butter
      `;
      
      await ctx.reply(helpMessage, { parse_mode: 'HTML' });
    });

    // Catalog status command
    this.bot.command('catalog_status', async (ctx) => {
      const message = this.productManager.formatCatalogStatus();
      await ctx.reply(message, { parse_mode: 'HTML' });
    });

    // Refresh catalog command
    this.bot.command('refresh_catalog', async (ctx) => {
      console.log('[Telegram] /refresh_catalog command received');
      await ctx.reply('🔄 Refreshing product catalog from Amul website... This may take a few minutes.');
      console.log('[Telegram] Sent initial reply');
      try {
        const result = await this.productManager.refreshCatalog();
        console.log('[Telegram] refreshCatalog result:', result);
        await ctx.reply(result.message, { parse_mode: 'HTML' });
        console.log('[Telegram] Sent result message');
        if (result.success) {
          const statusMessage = this.productManager.formatCatalogStatus();
          await ctx.reply(statusMessage, { parse_mode: 'HTML' });
          console.log('[Telegram] Sent catalog status');
        }
      } catch (error) {
        console.error('[Telegram] Error in /refresh_catalog:', error);
        await ctx.reply(`❌ Error refreshing catalog: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Handle unknown commands
    this.bot.on('text', async (ctx) => {
      await ctx.reply('❓ Unknown command. Use /help to see available commands.');
    });
  }

  private setupCallbacks(): void {
    // Handle category selection
    this.bot.action(/^category_(.+)$/, async (ctx) => {
      const category = ctx.match[1];
      const products = this.productManager.getProductsByCategory(category);
      
      const message = `
🛍️ <b>${category} Products</b>

${this.productManager.formatProductList(products)}

Select a product to monitor:
      `;
      
      await ctx.editMessageText(message, { 
        parse_mode: 'HTML',
        reply_markup: this.productManager.getProductsKeyboard(category)
      });
    });

    // Handle product selection
    this.bot.action(/^product_(.+)$/, async (ctx) => {
      const productId = ctx.match[1];
      const userId = ctx.from?.id.toString();
      
      if (!userId) {
        await ctx.reply('❌ Unable to identify user.');
        return;
      }

      const success = this.productManager.setUserProduct(userId, productId);
      if (success) {
        const product = this.productManager.getProductById(productId);
        const message = `
✅ <b>Product Selected Successfully!</b>

<b>${product?.name}</b>
📝 ${product?.description}
🏷️ Category: ${product?.category}
💰 Price: ${product?.price || 'Not available'}

You can now:
• Use /status to check current stock
• Use /start_monitoring to begin automatic monitoring
• Use /addtocart to add to cart (if configured)
        `;
        
        await ctx.editMessageText(message, { parse_mode: 'HTML' });
      } else {
        await ctx.reply('❌ Failed to select product. Please try again.');
      }
    });

    // Handle back to categories
    this.bot.action('back_to_categories', async (ctx) => {
      const message = `
🛍️ <b>Browse Amul Power of Protein Products</b>

Select a category to view available products:

${this.productManager.formatCategoryList()}

Use the buttons below to browse by category:
      `;
      
      await ctx.editMessageText(message, { 
        parse_mode: 'HTML',
        reply_markup: this.productManager.getProductSelectionKeyboard()
      });
    });
  }

  private formatStockStatus(status: StockStatus, productName: string): string {
    const emoji = status.isInStock ? '✅' : '❌';
    const statusText = status.isInStock ? 'IN STOCK' : 'OUT OF STOCK';
    const price = status.price ? `\n💰 Price: ${status.price}` : '';
    const error = status.error ? `\n⚠️ Error: ${status.error}` : '';
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
      if (!this.isMonitoring) return;

      try {
        // Get all users and their selected products
        const users = Array.from(this.productManager['userSelections'].keys());
        
        for (const userId of users) {
          const selection = this.productManager.getUserProduct(userId);
          if (!selection) continue;

          const monitor = new StockMonitor(selection.productUrl);
          const status = await monitor.checkStock();
          
          if (status.isInStock && this.shouldSendNotification()) {
            await this.sendStockNotification(status, selection, userId);
            this.updateLastNotification();
          }
        }
      } catch (error) {
        console.error('Error in monitoring loop:', error);
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
    const timeSinceLastNotification = Date.now() - this.notificationSettings.lastNotification.getTime();
    
    return timeSinceLastNotification >= cooldownMs;
  }

  private updateLastNotification(): void {
    this.notificationSettings.lastNotification = new Date();
  }

  private async sendStockNotification(status: StockStatus, selection: any, userId: string): Promise<void> {
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
      await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async launch(): Promise<void> {
    try {
      await this.bot.launch();
      console.log('🤖 Telegram bot started successfully!');
      
      // Graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error('Error launching bot:', error);
      throw error;
    }
  }

  stop(): void {
    this.bot.stop();
  }
} 