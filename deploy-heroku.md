# Heroku Deployment Guide

## Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed
- Git repository

## Steps

### 1. Prepare for Heroku
```bash
# Create a Procfile for Heroku
echo "worker: npm start" > Procfile

# Add buildpack for Node.js
heroku buildpacks:set heroku/nodejs
```

### 2. Create Heroku App
```bash
# Create a new Heroku app
heroku create your-amul-bot-name

# Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=your_bot_token
heroku config:set TELEGRAM_CHAT_ID=your_chat_id
heroku config:set AMUL_PRODUCT_URL=https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30

# Optional: Set Amul credentials
heroku config:set AMUL_EMAIL=your_email@example.com
heroku config:set AMUL_PASSWORD=your_password

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Start the worker dyno
heroku ps:scale worker=1
```

### 3. Monitor Your Bot
```bash
# View logs
heroku logs --tail

# Check dyno status
heroku ps
```

## Important Notes
- Heroku free tier is being discontinued, consider paid plans
- Worker dynos cost money but run 24/7
- Set up monitoring to ensure the bot stays running 