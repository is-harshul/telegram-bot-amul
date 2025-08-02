const puppeteer = require("puppeteer");

async function testPuppeteer() {
  console.log("🧪 Testing Puppeteer configuration...");

  // Detect environment
  const isServer =
    process.env.NODE_ENV === "production" ||
    process.env.PLATFORM === "linux" ||
    !process.env.DISPLAY;

  console.log("📊 Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    PLATFORM: process.env.PLATFORM,
    DISPLAY: process.env.DISPLAY,
    isServer: isServer,
  });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-pings",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        // Additional args for server environments
        ...(isServer
          ? [
              "--disable-xvfb",
              "--disable-background-networking",
              "--disable-background-timer-throttling",
              "--disable-client-side-phishing-detection",
              "--disable-component-extensions-with-background-pages",
              "--disable-domain-reliability",
              "--disable-features=AudioServiceOutOfProcess",
              "--disable-hang-monitor",
              "--disable-prompt-on-repost",
              "--disable-sync",
              "--force-color-profile=srgb",
              "--metrics-recording-only",
              "--no-default-browser-check",
              "--no-first-run",
              "--password-store=basic",
              "--use-mock-keychain",
            ]
          : []),
      ],
    });

    console.log("✅ Puppeteer browser launched successfully");

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("✅ Page created successfully");

    // Test navigation
    await page.goto(
      "https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30",
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    );

    console.log("✅ Navigation successful");

    // Test basic page evaluation
    const title = await page.title();
    console.log("📄 Page title:", title);

    await browser.close();
    console.log("✅ Browser closed successfully");
    console.log("🎉 Puppeteer test completed successfully!");
  } catch (error) {
    console.error("❌ Puppeteer test failed:", error.message);
    console.error("📋 Full error:", error);

    if (browser) {
      try {
        await browser.close();
        console.log("✅ Browser closed after error");
      } catch (closeError) {
        console.error("❌ Failed to close browser:", closeError.message);
      }
    }

    process.exit(1);
  }
}

// Run the test
testPuppeteer().catch(console.error);
