#!/bin/bash

echo "🚀 Amul Stock Bot - Quick Setup Guide"
echo "====================================="
echo ""

echo "📱 Step 1: Create Your Telegram Bot"
echo "-----------------------------------"
echo "1. Open Telegram and search for @BotFather"
echo "2. Send /newbot"
echo "3. Follow the prompts to create your bot"
echo "4. Copy the bot token (looks like: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)"
echo ""

read -p "Enter your bot token: " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot token is required!"
    exit 1
fi

echo ""
echo "🆔 Step 2: Get Your Chat ID"
echo "----------------------------"
echo "1. Start a conversation with your bot"
echo "2. Send any message to the bot"
echo "3. Visit this URL in your browser:"
echo "   https://api.telegram.org/bot$BOT_TOKEN/getUpdates"
echo "4. Look for 'chat':{'id':123456789} in the response"
echo ""

read -p "Enter your chat ID: " CHAT_ID

if [ -z "$CHAT_ID" ]; then
    echo "❌ Chat ID is required!"
    exit 1
fi

echo ""
echo "⚙️ Step 3: Configure Environment"
echo "--------------------------------"

# Create .env file
cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID

# Amul Website Configuration
AMUL_PRODUCT_URL=https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30

# Optional: Amul Account (for cart automation)
# AMUL_EMAIL=your_amul_email@example.com
# AMUL_PASSWORD=your_amul_password_here

# Monitoring Configuration
CHECK_INTERVAL_MINUTES=5
NOTIFICATION_COOLDOWN_MINUTES=30
EOF

echo "✅ .env file created successfully!"
echo ""

echo "🔧 Step 4: Install Dependencies"
echo "-------------------------------"
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🏗️ Step 5: Build the Project"
echo "----------------------------"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Test your bot: npm run dev"
echo "2. In Telegram, send /start to your bot"
echo "3. Use /start_monitoring to begin stock monitoring"
echo ""
echo "🔧 Optional: Edit .env to add Amul credentials for cart automation"
echo ""
echo "📖 For deployment options, see:"
echo "   - deploy-railway.md (free cloud hosting)"
echo "   - deploy-vps.md (self-hosted)"
echo "   - deploy-heroku.md (paid cloud hosting)"
echo ""
echo "🚀 Ready to start monitoring Amul stock!" 