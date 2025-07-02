import { Telegraf, Context } from 'telegraf';
import { StockMonitor } from './stockMonitor';
import { CartAutomation } from './cartAutomation';
import { BotConfig, StockStatus, NotificationSettings, BotCommand } from '../types';

export class TelegramBot {
  private bot: Telegraf<Context>;
  private stockMonitor: StockMonitor;
  private cartAutomation?: CartAutomation;
  private notificationSettings: NotificationSettings;
  private isMonitoring: boolean = false;

  constructor(config: BotConfig) {
    this.bot = new Telegraf(config.telegramToken);
    this.stockMonitor = new StockMonitor(config.productUrl);
    this.notificationSettings = {
      enabled: true,
      cooldownMinutes: config.notificationCooldownMinutes
    };

    if (config.amulCredentials) {
      this.cartAutomation = new CartAutomation(config.amulCredentials, config.productUrl);
    }

    this.setupCommands();
  }

  private setupCommands(): void {
    // Start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `
🚀 *Amul Stock Monitor Bot*

Welcome! I'll help you monitor the Amul High Protein Buttermilk stock.

*Available Commands:*
/start - Show this help message
/status - Check current stock status
/start_monitoring - Start automatic monitoring
/stop_monitoring - Stop automatic monitoring
/addtocart - Add product to cart (if logged in)
/help - Show detailed help

*Product:* Amul High Protein Buttermilk 200ml (Pack of 30)
*URL:* https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30

${this.cartAutomation ? '✅ Cart automation enabled' : '❌ Cart automation not configured'}
      `;
      
      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      await ctx.reply('🔍 Checking stock status...');
      
      try {
        const status = await this.stockMonitor.checkStock();
        const message = this.formatStockStatus(status);
        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply(`❌ Error checking stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Start monitoring command
    this.bot.command('start_monitoring', async (ctx) => {
      if (this.isMonitoring) {
        await ctx.reply('⚠️ Monitoring is already active!');
        return;
      }

      this.isMonitoring = true;
      await ctx.reply('✅ Stock monitoring started! I\'ll notify you when the product is back in stock.');
      
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
      if (!this.cartAutomation) {
        await ctx.reply('❌ Cart automation is not configured. Please set up your Amul credentials in the environment variables.');
        return;
      }

      await ctx.reply('🛒 Attempting to add product to cart...');
      
      try {
        const result = await this.cartAutomation.addToCart();
        const message = result.success 
          ? `✅ ${result.message}\n${result.cartUrl ? `Cart URL: ${result.cartUrl}` : ''}`
          : `❌ ${result.message}`;
        
        await ctx.reply(message);
      } catch (error) {
        await ctx.reply(`❌ Error adding to cart: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      const helpMessage = `
📖 *Detailed Help*

*Commands:*
• /start - Initialize the bot and show welcome message
• /status - Check current stock status manually
• /start_monitoring - Start automatic stock monitoring
• /stop_monitoring - Stop automatic monitoring
• /addtocart - Automatically add product to your Amul cart
• /help - Show this help message

*Features:*
• Real-time stock monitoring
• Automatic notifications when product is back in stock
• Cart automation (requires Amul account credentials)
• Cooldown system to prevent spam notifications

*Setup:*
1. Set your Telegram bot token in TELEGRAM_BOT_TOKEN
2. Set your chat ID in TELEGRAM_CHAT_ID
3. Optionally set Amul credentials for cart automation
4. Run the bot and use /start_monitoring

*Product Details:*
• Name: Amul High Protein Buttermilk 200ml (Pack of 30)
• URL: https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30
      `;
      
      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle unknown commands
    this.bot.on('text', async (ctx) => {
      await ctx.reply('❓ Unknown command. Use /help to see available commands.');
    });
  }

  private formatStockStatus(status: StockStatus): string {
    const emoji = status.isInStock ? '✅' : '❌';
    const statusText = status.isInStock ? 'IN STOCK' : 'OUT OF STOCK';
    const price = status.price ? `\n💰 Price: ${status.price}` : '';
    const error = status.error ? `\n⚠️ Error: ${status.error}` : '';
    const time = status.lastChecked.toLocaleString();

    return `
${emoji} *Stock Status: ${statusText}*
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
        const status = await this.stockMonitor.checkStock();
        
        if (status.isInStock && this.shouldSendNotification()) {
          await this.sendStockNotification(status);
          this.updateLastNotification();
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

  private async sendStockNotification(status: StockStatus): Promise<void> {
    const message = `
🎉 *PRODUCT IS BACK IN STOCK!*

${this.formatStockStatus(status)}

🛒 *Quick Actions:*
• Use /addtocart to automatically add to your cart
• Visit: https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30

⏰ *Notification Settings:*
• Cooldown: ${this.notificationSettings.cooldownMinutes} minutes
• Use /stop_monitoring to stop notifications
    `;

    try {
      await this.bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID!, message, { parse_mode: 'Markdown' });
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