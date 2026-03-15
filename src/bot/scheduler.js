// src/bot/scheduler.js
import { askPlanner } from "../ai/planner.js";
import { runCommand } from "./actions.js";
import { logger } from "../utils/logger.js";

/**
 * Starts a perpetual loop (default every 7 seconds) that:
 *   1. Gathers a tiny snapshot of the bot’s world (time, health, inventory)
 *   2. Sends that snapshot (plus recent chat) to the LLM planner
 *   3. Executes the JSON action the LLM returns
 *
 * The loop runs forever until the process exits.
 *
 * @param {import("mineflayer").Bot} bot
 * @param {number} intervalMs – how often to query the LLM (default 7000 ms)
 */
export function schedule(bot, intervalMs = 7_000) {
  // Helper to build a minimal “status” memory entry for the planner
  const buildStatusMessage = () => {
    const time = bot.time.timeOfDay; // 0‑24000 range
    const dayOrNight = time < 12542 ? "day" : "night";
    const health = bot.health.toFixed(1);
    const food = bot.food;
    const pos = bot.entity.position;
    const inventory = bot.inventory.items()
      .map((i) => `${i.name}×${i.count}`)
      .join(", ");

    return {
      role: "assistant",
      content: `Current state → time:${dayOrNight} (${time}), health:${health}, food:${food}, position:${pos.x.toFixed(
        1
      )},${pos.y.toFixed(1)},${pos.z.toFixed(1)}, inventory:[${inventory}]`,
    };
  };

  // The rolling memory used by the chat handler + this scheduler
  const sharedMemory = [{ role: "system", content: "" }]; // will be overwritten later

  // Periodic tick
  const tick = async () => {
    // 1️⃣  Refresh the system prompt (in case you edited it)
    sharedMemory[0] = {
      role: "system",
      content: require("../ai/prompts.js").SYSTEM_PROMPT,
    };

    // 2️⃣  Append a fresh status line
    sharedMemory.push(buildStatusMessage());

    // Keep the memory short (system + last 10 items)
    if (sharedMemory.length > 12) sharedMemory.splice(2, sharedMemory.length - 12);

    try {
      const action = await askPlanner(sharedMemory);
      const ok = await runCommand(bot, action);
      if (!ok) logger.warn(`Action ${action.action} reported failure`);
    } catch (e) {
      logger.error(`Scheduler error: ${e.message}`);
    }

    // Schedule the next tick
    setTimeout(tick, intervalMs);
  };

  // Kick‑off the first tick after the bot has fully spawned
  bot.once("spawn", () => {
    logger.info("📅 Scheduler started – querying LLM every " + intervalMs + " ms");
    tick();
  });
}

