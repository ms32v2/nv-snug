// src/bot/scheduler.js

import { askPlanner } from "../ai/planner.js";
import { runCommand } from "./actions.js";
import { logger } from "../utils/logger.js";
import { SYSTEM_PROMPT } from "../ai/prompts.js";

/**
 * AI scheduler loop
 * Collects bot state → sends to planner → executes action
 */

export function schedule(bot, intervalMs = 7000) {

  const buildStatusMessage = () => {

    const time = bot.time?.timeOfDay ?? 0;
    const dayOrNight = time < 12542 ? "day" : "night";

    const health =
      bot.health !== undefined && bot.health !== null
        ? bot.health.toFixed(1)
        : "unknown";

    const food =
      bot.food !== undefined && bot.food !== null
        ? bot.food
        : "unknown";

    const pos = bot.entity?.position;

    const x = pos?.x ?? 0;
    const y = pos?.y ?? 0;
    const z = pos?.z ?? 0;

    const inventoryItems = bot.inventory?.items?.() || [];

    const inventory = inventoryItems
      .map((i) => `${i.name}×${i.count}`)
      .join(", ");

    return {
      role: "assistant",
      content:
        `Current state → ` +
        `time:${dayOrNight} (${time}), ` +
        `health:${health}, ` +
        `food:${food}, ` +
        `position:${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}, ` +
        `inventory:[${inventory}]`
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

    try {

      // refresh system prompt
      sharedMemory[0] = {
        role: "system",
        content: SYSTEM_PROMPT
      };

      // push bot state
      sharedMemory.push(buildStatusMessage());

      // keep memory small
      if (sharedMemory.length > 12) {
        sharedMemory.splice(1, sharedMemory.length - 12);
      }

      const action = await askPlanner(sharedMemory);

      if (!action) {
        logger.warn("Planner returned no action");
      } else {
        await runCommand(bot, action);
      }

    } catch (e) {

      logger.error(`Scheduler error: ${e.message}`);

    }

    setTimeout(tick, intervalMs);
  };

  bot.once("spawn", () => {

    logger.info(
      `📅 Scheduler started — querying AI every ${intervalMs} ms`
    );

    // small delay so Mineflayer fully loads
    setTimeout(() => {
      tick();
    }, 3000);

  });

}
