# Railway Deployment Guide (Free Alternative)

## Prerequisites
- Railway account (railway.app)
- GitHub account
- Git repository

## Steps

### 1. Prepare Your Repository
```bash
# Create a Procfile
echo "worker: npm start" > Procfile

# Commit your changes
git add .
git commit -m "Add Railway deployment files"
git push origin main
```

### 2. Deploy on Railway
1. **Go to [Railway.app](https://railway.app)**
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**
6. **Railway will automatically detect it's a Node.js app**

### 3. Configure Environment Variables
In Railway dashboard:
1. Go to your project
2. Click on "Variables" tab
3. Add these environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   AMUL_PRODUCT_URL=https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30
   AMUL_EMAIL=your_email@example.com (optional)
   AMUL_PASSWORD=your_password (optional)
   CHECK_INTERVAL_MINUTES=5
   NOTIFICATION_COOLDOWN_MINUTES=30
   ```

### 4. Deploy
1. Railway will automatically build and deploy
2. Check the "Deployments" tab for build status
3. View logs in the "Logs" tab

## Advantages of Railway
- Free tier available
- Automatic deployments from GitHub
- Easy environment variable management
- Built-in monitoring and logs 