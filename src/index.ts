import { config } from './config';
import { TelegramBot } from './services/telegramBot';

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Amul Stock Monitor Bot...');
    
    // Validate configuration
    if (!config.telegramToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    
    if (!config.chatId) {
      throw new Error('TELEGRAM_CHAT_ID is required');
    }
    
    console.log('✅ Configuration loaded successfully');
    console.log(`📱 Product URL: ${config.productUrl}`);
    console.log(`⏰ Check interval: ${config.checkIntervalMinutes} minutes`);
    console.log(`🔔 Notification cooldown: ${config.notificationCooldownMinutes} minutes`);
    
    if (config.amulCredentials) {
      console.log('🛒 Cart automation: Enabled');
    } else {
      console.log('🛒 Cart automation: Disabled (no credentials provided)');
    }
    
    // Create and launch the bot
    const bot = new TelegramBot(config);
    await bot.launch();
    
    console.log('🎉 Bot is now running!');
    console.log('📋 Available commands:');
    console.log('  /start - Initialize the bot');
    console.log('  /status - Check stock status');
    console.log('  /start_monitoring - Start automatic monitoring');
    console.log('  /stop_monitoring - Stop monitoring');
    console.log('  /addtocart - Add to cart (if configured)');
    console.log('  /help - Show detailed help');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('❌ Application error:', error);
  process.exit(1);
}); 