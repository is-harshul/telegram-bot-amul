#!/usr/bin/env ts-node

import fetch from "node-fetch";
import { config } from "./src/config";

async function testBotToken() {
  console.log("🤖 Testing bot token...\n");

  if (!config.telegramToken) {
    console.error("❌ No bot token found in environment variables");
    return;
  }

  console.log(`🔑 Bot token: ${config.telegramToken.substring(0, 10)}...`);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegramToken}/getMe`,
      {
        method: "GET",
        timeout: 10000,
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Bot token is valid!");
      console.log(`📱 Bot name: ${data.result.first_name}`);
      console.log(`👤 Username: @${data.result.username}`);
      console.log(`🆔 Bot ID: ${data.result.id}`);
      console.log(`🔗 Username: ${data.result.username}`);
    } else {
      console.log("❌ Bot token is invalid");
      console.log(`📝 Error: ${data.description}`);
      console.log(`🔢 Error code: ${data.error_code}`);
    }
  } catch (error) {
    console.error("❌ Error testing bot token:", error);
  }
}

testBotToken().catch(console.error);
