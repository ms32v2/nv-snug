// src/bot/eventHandlers.js
import { logger } from "../utils/logger.js";

/**
 * Attach a few handy event listeners (time change, death, health drop, etc.).
 * This file is **optional** – you can require it from index.js if you like.
 */
export function attachEventHandlers(bot) {
  // Log whenever the world time changes (helps the planner know day/night)
  bot.on("time", (time) => {
    const dayOrNight = time < 12542 ? "day" : "night";
    logger.info(`⏰ Time ${time} → ${dayOrNight}`);
  });

  // Warn when the bot dies
  bot.on("death", () => {
    logger.warn("💀 I died! Respawning…");
    bot.chat("I died! Give me a moment to get back up.");
  });

  // Health warnings
  bot.on("health", () => {
    if (bot.health < 6) {
      bot.chat("I’m low on health! Please help me out.");
    }
  });

  // Food warnings
  bot.on("food", () => {
    if (bot.food < 6) {
      bot.chat("I’m hungry! Need some food.");
    }
  });
}

