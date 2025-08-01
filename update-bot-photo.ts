import { Telegraf } from "telegraf";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

async function updateBotPhoto() {
  try {
    // Path to your photo file (should be a square image, max 640x640)
    const photoPath = path.join(__dirname, "bot-photo.jpg"); // or .png

    if (!fs.existsSync(photoPath)) {
      console.error(
        '❌ Photo file not found. Please add your photo as "bot-photo.jpg" in the project root.'
      );
      return;
    }

    // Read the photo file
    const photoBuffer = fs.readFileSync(photoPath);

    // Update bot profile photo
    const result = await bot.telegram.setProfilePhoto(photoBuffer);

    console.log("✅ Bot profile photo updated successfully!");
    console.log("📸 Photo ID:", result.photo_id);
  } catch (error) {
    console.error("❌ Error updating bot photo:", error);
  } finally {
    process.exit(0);
  }
}

// Run the update
updateBotPhoto();
