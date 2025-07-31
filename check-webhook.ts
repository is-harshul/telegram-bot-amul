#!/usr/bin/env ts-node

import fetch from "node-fetch";
import { config } from "./src/config";

async function checkWebhook() {
  console.log("🔍 Checking bot webhook status...\n");

  if (!config.telegramToken) {
    console.error("❌ No bot token found in environment variables");
    return;
  }

  try {
    // Check current webhook info
    const response = await fetch(
      `https://api.telegram.org/bot${config.telegramToken}/getWebhookInfo`,
      {
        method: "GET",
        timeout: 10000,
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log("📋 Webhook Info:");
      console.log(`URL: ${data.result.url || "None"}`);
      console.log(
        `Has custom certificate: ${data.result.has_custom_certificate}`
      );
      console.log(`Pending update count: ${data.result.pending_update_count}`);
      console.log(`Last error date: ${data.result.last_error_date || "None"}`);
      console.log(
        `Last error message: ${data.result.last_error_message || "None"}`
      );

      if (data.result.url) {
        console.log(
          "\n⚠️ Webhook is configured! This might be causing the conflict."
        );
        console.log("🔄 Attempting to delete webhook...");

        const deleteResponse = await fetch(
          `https://api.telegram.org/bot${config.telegramToken}/deleteWebhook`,
          {
            method: "POST",
            timeout: 10000,
          }
        );

        const deleteData = await deleteResponse.json();

        if (deleteData.ok) {
          console.log("✅ Webhook deleted successfully!");
          console.log("💡 You can now try running the bot again.");
        } else {
          console.log("❌ Failed to delete webhook:", deleteData.description);
        }
      } else {
        console.log(
          "\n✅ No webhook configured - this is good for polling mode."
        );
      }
    } else {
      console.log("❌ Failed to get webhook info:", data.description);
    }
  } catch (error) {
    console.error("❌ Error checking webhook:", error);
  }
}

checkWebhook().catch(console.error);
