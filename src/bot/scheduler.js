// src/bot/scheduler.js

import { askPlanner } from "../ai/planner.js";
import { runCommand } from "./actions.js";
import { logger } from "../utils/logger.js";
import { SYSTEM_PROMPT } from "../ai/prompts.js";

/**
 * Starts a perpetual loop that:
 * 1. Collects bot status
 * 2. Sends it to the AI planner
 * 3. Executes the returned command
 */

export function schedule(bot, intervalMs = 7000) {

  const buildStatusMessage = () => {

    const time = bot.time.timeOfDay;
    const dayOrNight = time < 12542 ? "day" : "night";

    const health = bot.health.toFixed(1);
    const food = bot.food;

    const pos = bot.entity.position;

    const inventory = bot.inventory.items()
      .map(i => `${i.name}×${i.count}`)
      .join(", ");

    return {
      role: "assistant",
      content: `Current state → time:${dayOrNight} (${time}), health:${health}, food:${food}, position:${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}, inventory:[${inventory}]`
    };
  };

  // shared memory for AI
  const sharedMemory = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    }
  ];

  const tick = async () => {

    // update system prompt (in case it changes)
    sharedMemory[0] = {
      role: "system",
      content: SYSTEM_PROMPT
    };

    // add status snapshot
    sharedMemory.push(buildStatusMessage());

    // keep memory small
    if (sharedMemory.length > 12) {
      sharedMemory.splice(2, sharedMemory.length - 12);
    }

    try {

      const action = await askPlanner(sharedMemory);

      if (!action) return;

      await runCommand(bot, action);

    } catch (e) {

      logger.error(`Scheduler error: ${e.message}`);

    }

    setTimeout(tick, intervalMs);
  };

  bot.once("spawn", () => {

    logger.info("📅 Scheduler started – querying AI every " + intervalMs + " ms");

    tick();

  });

}
