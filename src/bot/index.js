// src/bot/index.js
import mineflayer from "mineflayer";
import { config } from "dotenv";
import { attachChatHandler } from "./chat.js";
import { schedule } from "./scheduler.js";
import { logger } from "../utils/logger.js";

config(); // load .env

// -------------------------------------------------
// 1️⃣  Bot name & auto‑login command
// -------------------------------------------------
const BOT_NAME = process.env.BOT_USERNAME || "Ronny";          // default name
const LOGIN_COMMAND = "/login cpmp0043";                      // hard‑coded login command

// -------------------------------------------------
// 2️⃣  Create the Mineflayer client
// -------------------------------------------------
const bot = mineflayer.createBot({
  host: process.env.MC_HOST,
  port: parseInt(process.env.MC_PORT, 10) || 25565,
  username: BOT_NAME,
  // password: process.env.MC_PASSWORD,   // uncomment if you use a premium account
});

// -------------------------------------------------
// 3️⃣  Auto‑login as soon as we spawn
// -------------------------------------------------
bot.once("spawn", async () => {
  logger.info(`✅ Bot "${BOT_NAME}" spawned on ${process.env.MC_HOST}`);

  // Some servers need a short pause before they accept chat commands
  setTimeout(() => {
    bot.chat(LOGIN_COMMAND);
    logger.info(`🔐 Sent auto‑login command → ${LOGIN_COMMAND}`);
  }, 2_000); // 2 seconds – increase if your server is slower

  // Friendly greeting
  bot.chat("Hey! I’m Ronny, an AI‑powered bot. Ask me anything.");
});

// -------------------------------------------------
// 4️⃣  Forward in‑game chat to the LLM
// -------------------------------------------------
attachChatHandler(bot);

// -------------------------------------------------
// 5️⃣  Start the day‑night planner loop
// -------------------------------------------------
schedule(bot);

// -------------------------------------------------
// 6️⃣  Graceful shutdown handling
// -------------------------------------------------
process.on("SIGINT", () => {
  logger.info("\n👋 Shutting down…");
  bot.quit();
  process.exit(0);
});

