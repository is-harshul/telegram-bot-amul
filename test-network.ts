#!/usr/bin/env ts-node

import fetch from "node-fetch";

async function testNetworkConnectivity() {
  console.log("🌐 Testing network connectivity...\n");

  const tests = [
    {
      name: "DNS Resolution",
      url: "https://api.telegram.org",
      description: "Testing if we can resolve api.telegram.org",
    },
    {
      name: "Telegram API (api.telegram.org)",
      url: "https://api.telegram.org/bot123456:test/getMe",
      description:
        "Testing Telegram API endpoint (will fail with 401, but should connect)",
    },
    {
      name: "Telegram Core (core.telegram.org)",
      url: "https://core.telegram.org",
      description: "Testing Telegram Core endpoint",
    },
    {
      name: "General Internet",
      url: "https://httpbin.org/get",
      description: "Testing general internet connectivity",
    },
  ];

  for (const test of tests) {
    console.log(`🔍 ${test.name}: ${test.description}`);

    try {
      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: "HEAD",
        timeout: 10000,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        console.log(`✅ ${test.name}: SUCCESS (${duration}ms)`);
      } else {
        console.log(
          `⚠️ ${test.name}: PARTIAL (HTTP ${response.status}) (${duration}ms)`
        );
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      if (error instanceof Error) {
        if (error.message.includes("ENOTFOUND")) {
          console.log("   💡 This indicates a DNS resolution problem");
        } else if (error.message.includes("ECONNRESET")) {
          console.log(
            "   💡 This indicates a connection reset (network issue)"
          );
        } else if (error.message.includes("timeout")) {
          console.log("   💡 This indicates a timeout (slow connection)");
        }
      }
    }

    console.log("");
  }

  console.log("📋 Summary:");
  console.log("• If DNS Resolution fails: Check your internet connection");
  console.log(
    "• If Telegram API fails but others work: Telegram might be blocked"
  );
  console.log(
    "• If all fail: Check your network connection and firewall settings"
  );
}

testNetworkConnectivity().catch(console.error);
