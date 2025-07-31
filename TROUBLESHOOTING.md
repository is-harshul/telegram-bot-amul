# Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Amul Stock Monitor Bot.

## Common Issues

### 1. Network Connectivity Issues

**Symptoms:**
- `ENOTFOUND` errors
- `ECONNRESET` errors
- `timeout` errors
- Bot fails to start

**Diagnosis:**
Run the network connectivity test:
```bash
npm run test-network
```

**Solutions:**
- Check your internet connection
- Try using a different network (mobile hotspot)
- Check if your firewall is blocking the connection
- Try using a VPN if Telegram is blocked in your region

### 2. Bot Token Issues

**Symptoms:**
- `401 Unauthorized` errors
- Bot doesn't respond to commands

**Solutions:**
- Verify your bot token is correct
- Make sure the bot token is in the format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- Check if the bot is still active in @BotFather

### 3. Chat ID Issues

**Symptoms:**
- Bot starts but doesn't send notifications
- `chat not found` errors

**Solutions:**
- Make sure you've started a conversation with the bot first
- Use `/start` command in the bot chat
- Verify the chat ID is correct

### 4. Puppeteer/Chrome Issues

**Symptoms:**
- Stock checking fails
- Browser automation errors

**Solutions:**
- Install Chrome/Chromium browser
- On Linux: `sudo apt-get install chromium-browser`
- On macOS: `brew install chromium`
- On Windows: Download Chrome from google.com

### 5. Environment Variables

**Symptoms:**
- Configuration errors
- Missing required variables

**Required Variables:**
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

**Optional Variables:**
```bash
AMUL_EMAIL=your_amul_email@example.com
AMUL_PASSWORD=your_amul_password
AMUL_PIN=your_amul_pin
```

## Debugging Steps

### Step 1: Check Network
```bash
npm run test-network
```

### Step 2: Check Configuration
```bash
npm run dev
```
Look for configuration errors in the output.

### Step 3: Test Bot Token
1. Go to @BotFather on Telegram
2. Send `/mybots`
3. Select your bot
4. Check if it's active

### Step 4: Test Chat ID
1. Start a conversation with your bot
2. Send `/start`
3. Check if the bot responds

### Step 5: Test Stock Checking
```bash
npm run dev
```
Then send `/status` to the bot to test stock checking.

## Error Messages Explained

### `ENOTFOUND`
- **Cause:** DNS resolution failed
- **Solution:** Check internet connection, try different DNS servers

### `ECONNRESET`
- **Cause:** Connection was reset by server
- **Solution:** Usually temporary, try again in a few minutes

### `timeout`
- **Cause:** Request took too long
- **Solution:** Check internet speed, try again

### `401 Unauthorized`
- **Cause:** Invalid bot token
- **Solution:** Check bot token with @BotFather

### `chat not found`
- **Cause:** Invalid chat ID or bot not started
- **Solution:** Start conversation with bot first

## Getting Help

If you're still having issues:

1. Run the network test: `npm run test-network`
2. Check the console output for specific error messages
3. Make sure all environment variables are set correctly
4. Try running the bot in development mode: `npm run dev`

## Common Commands

```bash
# Test network connectivity
npm run test-network

# Run in development mode
npm run dev

# Build for production
npm run build

# Run in production
npm start
``` 