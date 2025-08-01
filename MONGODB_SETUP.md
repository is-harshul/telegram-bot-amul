# MongoDB Setup for Amul Stock Bot

## 🗄️ Database Configuration

The bot now uses MongoDB to store user data, tracking preferences, and pincodes. Here's how to set it up:

## 📋 Environment Variables

Add these to your `.env` file:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/amul-bot
MONGODB_DB_NAME=amul-bot
```

## 🚀 MongoDB Installation

### Option 1: Local MongoDB

1. **Install MongoDB Community Edition:**
   ```bash
   # macOS (using Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community

   # Ubuntu/Debian
   sudo apt-get install mongodb

   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB:**
   ```bash
   # macOS
   brew services start mongodb-community

   # Ubuntu/Debian
   sudo systemctl start mongod

   # Windows
   # MongoDB runs as a service
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/atlas
   - Sign up for free account
   - Create a new cluster

2. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update Environment Variable:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/amul-bot
   ```

## 📊 Database Schema

### Users Collection
```javascript
{
  telegramId: "123456789",
  username: "john_doe",
  firstName: "John",
  lastName: "Doe",
  pincode: "110001",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

### ProductTracking Collection
```javascript
{
  userId: "123456789",
  productId: "high-protein-buttermilk-200ml-30pack",
  productName: "Amul High Protein Buttermilk 200ml (Pack of 30)",
  productUrl: "https://shop.amul.com/en/product/...",
  isTracking: true,
  notificationEnabled: true,
  lastChecked: Date,
  lastStockStatus: false,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Database Operations

The bot automatically handles:

- ✅ **User Registration**: When users first interact with the bot
- ✅ **Pincode Management**: Store and update delivery pincodes
- ✅ **Product Tracking**: Track which users monitor which products
- ✅ **Stock Status**: Track last stock status to avoid duplicate notifications
- ✅ **Notification Preferences**: Enable/disable notifications per user

## 📈 Admin Commands

### `/users` - View Statistics
Shows:
- Total registered users
- Active tracking count
- List of currently tracked products

### `/start_monitoring_service` - Start Monitoring
Manually starts the monitoring service for all users.

## 🎯 Features

### User Management
- **Automatic Registration**: Users are created when they first interact
- **Pincode Storage**: Each user can set their delivery pincode
- **Profile Management**: Store username, first name, last name

### Product Tracking
- **Multiple Products**: Users can track multiple products
- **Individual Control**: Start/stop tracking per product
- **Notification Settings**: Enable/disable notifications per product

### Stock Monitoring
- **Persistent Tracking**: Tracking continues even if bot restarts
- **Smart Notifications**: Only notify when stock changes from out to in
- **Status Tracking**: Track last stock status to avoid spam

## 🚀 Getting Started

1. **Install MongoDB** (see installation options above)
2. **Add MongoDB URI** to your `.env` file
3. **Start the bot**: `npm run dev`
4. **Test with users**: Send `/start` to the bot

The bot will automatically:
- Create user records when users interact
- Store tracking preferences in the database
- Send notifications when products come back in stock
- Track all user interactions and preferences

## 🔍 Monitoring

The bot logs all database operations:
- User creation/updates
- Tracking status changes
- Stock status updates
- Notification sends

Check the console logs for detailed database activity. 