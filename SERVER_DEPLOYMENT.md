# Server Deployment Guide

This guide helps you deploy the Amul Stock Bot on Linux servers with proper Puppeteer configuration.

## Prerequisites

### For Ubuntu/Debian Servers

Install required dependencies for Puppeteer:

```bash
# Update package list
sudo apt-get update

# Install Chromium and required fonts
sudo apt-get install -y \
  chromium-browser \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-thai-tlwg \
  fonts-kacst \
  fonts-freefont-ttf \
  libxss1 \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

### For CentOS/RHEL Servers

```bash
# Install EPEL repository
sudo yum install -y epel-release

# Install Chromium and dependencies
sudo yum install -y \
  chromium \
  liberation-fonts \
  liberation-narrow-fonts \
  liberation-sans-fonts \
  liberation-serif-fonts
```

### For Docker Deployment

Add this to your Dockerfile:

```dockerfile
# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium-browser \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Environment Variables

Set these environment variables for server deployment:

```bash
# Production environment
export NODE_ENV=production

# Platform detection
export PLATFORM=linux

# Disable display (for headless mode)
unset DISPLAY
```

## Troubleshooting

### Error: "Failed to launch the browser process"

**Solution**: Install Chromium and dependencies as shown above.

### Error: "Missing X server or $DISPLAY"

**Solution**: This is expected in headless mode. The bot automatically detects server environments and uses appropriate settings.

### Error: "Failed to connect to the bus"

**Solution**: This is a harmless warning in server environments. The bot will continue to work normally.

### Performance Issues

**Solution**: The bot includes fallback mechanisms:
1. First tries Puppeteer (best for JavaScript-heavy sites)
2. Falls back to Cheerio (faster, works without browser)
3. Returns error status if both fail

## Monitoring

### Check if Puppeteer is working:

```bash
# Test Puppeteer launch
node -e "
const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Puppeteer working correctly');
    await browser.close();
  } catch (error) {
    console.error('❌ Puppeteer failed:', error.message);
  }
})();
"
```

### Check bot logs:

```bash
# View real-time logs
tail -f logs/bot.log

# Check for Puppeteer errors
grep -i "puppeteer\|browser\|chrome" logs/bot.log
```

## Fallback Mechanism

The bot includes a robust fallback system:

1. **Primary**: Puppeteer with full browser rendering
2. **Fallback**: Cheerio for basic HTML parsing
3. **Error Handling**: Graceful error responses

If Puppeteer fails, the bot automatically switches to Cheerio mode and continues functioning.

## Performance Optimization

### For High-Traffic Servers

1. **Memory Management**: The bot automatically closes browser instances
2. **Connection Pooling**: Reuses connections where possible
3. **Caching**: Implements caching to reduce redundant requests
4. **Error Recovery**: Automatic retry with exponential backoff

### Resource Usage

- **Memory**: ~50-100MB per browser instance
- **CPU**: Minimal usage in headless mode
- **Network**: Only when checking stock status

## Security Considerations

1. **Sandbox Disabled**: Required for server environments
2. **No GUI**: Runs completely headless
3. **Limited Permissions**: Minimal file system access
4. **Network Isolation**: Only accesses required URLs

## Deployment Checklist

- [ ] Install Chromium and dependencies
- [ ] Set `NODE_ENV=production`
- [ ] Configure environment variables
- [ ] Test Puppeteer launch
- [ ] Monitor initial deployment
- [ ] Set up logging
- [ ] Configure process manager (PM2/systemd)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review bot logs for specific error messages
3. Test Puppeteer installation separately
4. Verify all dependencies are installed
5. Ensure proper environment variables are set 