#!/bin/bash

echo "🚀 Setting up Amul Stock Monitor Telegram Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your configuration:"
echo "   - TELEGRAM_BOT_TOKEN (get from @BotFather)"
echo "   - TELEGRAM_CHAT_ID (your chat ID)"
echo "   - Optional: AMUL_EMAIL and AMUL_PASSWORD for cart automation"
echo ""
echo "2. Start the bot:"
echo "   npm run dev    # Development mode"
echo "   npm start      # Production mode"
echo ""
echo "3. In Telegram, send /start to your bot to begin"
echo ""
echo "📖 For detailed instructions, see README.md" 