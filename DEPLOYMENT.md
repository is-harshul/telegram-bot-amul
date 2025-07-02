# 🚀 Deployment Guide - Amul Stock Monitor Bot

## Quick Start (Recommended)

Run the automated setup script:
```bash
./quick-setup.sh
```

This will guide you through getting your bot token, chat ID, and setting up the environment.

## 📱 Getting Bot Token & Chat ID

### 1. Create Telegram Bot
1. Open Telegram → Search `@BotFather`
2. Send `/newbot`
3. Follow prompts (name + username ending with 'bot')
4. **Copy the token** (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Chat ID
**Method A: Using Bot API**
1. Start conversation with your bot
2. Send any message to bot
3. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"chat":{"id":123456789}` in response

**Method B: Using @userinfobot**
1. Search `@userinfobot` in Telegram
2. Send `/start`
3. It replies with your chat ID

## 🏠 Local Deployment (Testing)

```bash
# 1. Setup environment
cp .env.example .env
nano .env  # Edit with your credentials

# 2. Install & build
npm install
npm run build

# 3. Run bot
npm run dev    # Development mode
npm start      # Production mode
```

## ☁️ Cloud Deployment Options

### Option 1: Railway (Free) ⭐ Recommended
- **Cost**: Free tier available
- **Setup**: 5 minutes
- **Guide**: See `deploy-railway.md`

### Option 2: Heroku (Paid)
- **Cost**: $7/month minimum
- **Setup**: 10 minutes
- **Guide**: See `deploy-heroku.md`

### Option 3: VPS (Self-hosted)
- **Cost**: $5-10/month
- **Setup**: 30 minutes
- **Guide**: See `deploy-vps.md`

## 🔧 Environment Variables

Required:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
AMUL_PRODUCT_URL=https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30
```

Optional:
```env
AMUL_EMAIL=your_amul_email@example.com
AMUL_PASSWORD=your_amul_password_here
CHECK_INTERVAL_MINUTES=5
NOTIFICATION_COOLDOWN_MINUTES=30
```

## 🧪 Testing Your Bot

1. **Start the bot**: `npm run dev`
2. **In Telegram**: Send `/start` to your bot
3. **Test commands**:
   - `/status` - Check current stock
   - `/start_monitoring` - Begin automatic monitoring
   - `/addtocart` - Add to cart (if configured)

## 📊 Monitoring & Logs

### Local
```bash
# View logs
npm run dev

# Check status
curl http://localhost:3000/health
```

### Cloud Platforms
- **Railway**: Dashboard → Logs tab
- **Heroku**: `heroku logs --tail`
- **VPS**: `pm2 logs amul-stock-bot`

## 🔒 Security Best Practices

1. **Never commit `.env` file**
2. **Use environment variables in production**
3. **Keep bot token secure**
4. **Regularly update dependencies**
5. **Monitor bot activity**

## 🚨 Troubleshooting

### Bot not responding?
- Check bot token is correct
- Ensure you've started conversation with bot
- Verify chat ID is correct

### Stock detection issues?
- Website structure may have changed
- Check console logs for errors
- Try running in development mode

### Deployment issues?
- Check platform-specific guides
- Verify environment variables
- Check build logs

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review platform-specific deployment guides
3. Check the logs for error messages
4. Ensure all environment variables are set correctly

## 🎯 Next Steps

1. **Choose deployment option** based on your needs
2. **Set up monitoring** to ensure bot stays running
3. **Test thoroughly** before relying on notifications
4. **Consider backup monitoring** for critical stock alerts

---

**Happy monitoring! 🎉** 