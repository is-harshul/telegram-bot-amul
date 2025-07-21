# Amul Power of Protein Stock Monitor Telegram Bot

A TypeScript-based Telegram bot that monitors any product from Amul's Power of Protein collection for stock availability and can automatically add it to your cart when it's back in stock.

## Features

- 🛍️ **Multi-Product Support**: Browse and monitor any product from the entire Amul Power of Protein collection
- 🔍 **Real-time Stock Monitoring**: Continuously checks product pages for stock availability
- 📱 **Telegram Notifications**: Sends instant notifications when products are back in stock
- 🛒 **Cart Automation**: Automatically adds products to your Amul cart (requires login credentials)
- ⏰ **Smart Cooldown**: Prevents spam notifications with configurable cooldown periods
- 🛡️ **Error Handling**: Robust error handling and recovery mechanisms
- 📊 **Status Tracking**: Keeps track of stock status and provides detailed information
- 🎯 **User-Specific Monitoring**: Each user can select and monitor different products

## Product Collection

The bot monitors the entire **[Amul Power of Protein collection](https://shop.amul.com/en/collection/power-of-protein)** including:

- **Buttermilk**: High Protein Buttermilk (200ml packs)
- **Milk**: High Protein Milk (500ml, 1L)
- **Curd**: High Protein Curd (200g, 400g)
- **Paneer**: High Protein Paneer (100g, 200g)
- **Cheese**: High Protein Cheese (100g, 200g)
- **Ghee**: High Protein Ghee (500g, 1kg)
- **Butter**: High Protein Butter (100g, 500g)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Telegram bot token (get from [@BotFather](https://t.me/botfather))
- Your Telegram chat ID
- Optional: Amul account credentials for cart automation

## Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd amul-stock-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Required: Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   
   # Required: Default Product URL (can be any product from the collection)
   AMUL_PRODUCT_URL=https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30
   
   # Optional: Amul Account (for cart automation)
   AMUL_EMAIL=your_amul_email@example.com
   AMUL_PASSWORD=your_amul_password_here
   
   # Optional: Monitoring Configuration
   CHECK_INTERVAL_MINUTES=5
   NOTIFICATION_COOLDOWN_MINUTES=30
   ```

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token and add it to your `.env` file

### 2. Get Your Chat ID

1. Start a conversation with your bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `chat.id` field in the response
5. Add this ID to your `.env` file

### 3. Optional: Set Up Amul Credentials

For cart automation functionality:
1. Create an account on [shop.amul.com](https://shop.amul.com)
2. Add your email and password to the `.env` file
3. The bot will be able to automatically add products to your cart

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Available Commands

Once the bot is running, you can use these commands in Telegram:

- `/start` - Initialize the bot and show welcome message
- `/products` - Browse and select products to monitor
- `/current` - Show currently selected product
- `/status` - Check current stock status manually
- `/start_monitoring` - Start automatic stock monitoring
- `/stop_monitoring` - Stop automatic monitoring
- `/addtocart` - Automatically add product to your Amul cart (if configured)
- `/help` - Show detailed help

### Product Selection Flow

1. **Start the bot**: Send `/start`
2. **Browse products**: Send `/products` to see all categories
3. **Select category**: Click on a category button (Buttermilk, Milk, etc.)
4. **Choose product**: Click on a specific product to select it
5. **Monitor stock**: Use `/status` to check stock or `/start_monitoring` for automatic monitoring

## How It Works

1. **Product Browsing**: Users can browse the entire Amul Power of Protein collection by category
2. **Product Selection**: Each user can select their preferred product to monitor
3. **Stock Monitoring**: The bot uses Puppeteer to scrape product pages and check for stock indicators
4. **Notification System**: When stock becomes available, it sends a formatted message to the user
5. **Cart Automation**: If configured, it can log into your Amul account and add the product to cart
6. **Cooldown System**: Prevents multiple notifications within a short time period

## Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | - | ✅ |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | - | ✅ |
| `AMUL_PRODUCT_URL` | Default product URL (can be any from collection) | - | ✅ |
| `AMUL_EMAIL` | Amul account email | - | ❌ |
| `AMUL_PASSWORD` | Amul account password | - | ❌ |
| `CHECK_INTERVAL_MINUTES` | How often to check stock (minutes) | 5 | ❌ |
| `NOTIFICATION_COOLDOWN_MINUTES` | Cooldown between notifications (minutes) | 30 | ❌ |

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if the bot token is correct
   - Ensure you've started a conversation with the bot
   - Verify the chat ID is correct

2. **Stock detection not working**
   - The website structure might have changed
   - Check the console logs for errors
   - Try running in development mode for debugging

3. **Cart automation failing**
   - Verify your Amul credentials are correct
   - Check if the login page structure has changed
   - Ensure your Amul account is active

4. **Product selection not working**
   - Make sure you've selected a product using `/products`
   - Check if the product URLs are still valid
   - Try selecting a different product

### Debug Mode

For debugging, you can run the bot with more verbose logging:
```bash
DEBUG=* npm run dev
```

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token and credentials secure
- The bot runs locally on your machine, so your credentials stay private
- Consider using environment variables in production

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.

## Disclaimer

This bot is for educational and personal use only. Please respect the terms of service of both Telegram and Amul. The bot may need updates if the website structure changes. 