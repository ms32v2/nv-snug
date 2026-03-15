// src/bot/index.js
import mineflayer from "mineflayer";
import pkg from "mineflayer-pathfinder";
import { config } from "dotenv";

import { attachChatHandler } from "./chat.js";
import { schedule } from "./scheduler.js";
import { logger } from "../utils/logger.js";

config();

// Load pathfinder plugin
const { pathfinder } = pkg;

// -------------------------------------------------
// 1️⃣ Bot name & auto-login command
// -------------------------------------------------
const BOT_NAME = process.env.BOT_USERNAME || "Ronny";
const LOGIN_COMMAND = "/login <cpmp0043>";

// -------------------------------------------------
// 2️⃣ Create the Mineflayer client
// -------------------------------------------------
const bot = mineflayer.createBot({
  host: process.env.MC_HOST,
  port: parseInt(process.env.MC_PORT, 10) || 25565,
  username: BOT_NAME
});

// -------------------------------------------------
// 3️⃣ Load plugins (IMPORTANT)
// -------------------------------------------------
bot.loadPlugin(pathfinder);

// -------------------------------------------------
// 4️⃣ Auto-login as soon as we spawn
// -------------------------------------------------
bot.once("spawn", async () => {

  logger.info(`✅ Bot "${BOT_NAME}" spawned on ${process.env.MC_HOST}`);

  setTimeout(() => {
    bot.chat(LOGIN_COMMAND);
    logger.info(`🔐 Sent auto-login command → ${LOGIN_COMMAND}`);
  }, 2000);

  bot.chat("Hey! I’m Ronny, an AI-powered bot. Ask me anything.");

});

// -------------------------------------------------
// 5️⃣ Forward in-game chat to the AI
// -------------------------------------------------
attachChatHandler(bot);

// -------------------------------------------------
// 6️⃣ Start the AI scheduler loop
// -------------------------------------------------
schedule(bot);

// -------------------------------------------------
// 7️⃣ Error logging
// -------------------------------------------------
bot.on("error", (err) => {
  logger.error(`Bot error: ${err.message}`);
});

bot.on("kicked", (reason) => {
  logger.warn(`Bot kicked: ${reason}`);
});

// -------------------------------------------------
// 8️⃣ Graceful shutdown
// -------------------------------------------------
process.on("SIGINT", () => {

  logger.info("👋 Shutting down...");
  bot.quit();
  process.exit(0);

});
