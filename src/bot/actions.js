// src/bot/actions.js

import pkg from "mineflayer-pathfinder";
const { GoalBlock } = pkg.goals;

import { Vec3 } from "vec3";
import { logger } from "../utils/logger.js";

/* ------------------------------------------------ */
/* Helper */
async function safeExec(name, fn) {
  try {
    await fn();
    logger.info(`✅ ${name} succeeded`);
    return true;
  } catch (e) {
    logger.warn(`❌ ${name} failed → ${e.message}`);
    return false;
  }
}

/* ------------------------------------------------ */
/* SAY */
export async function say(bot, { text }) {
  return safeExec(`say "${text}"`, () => bot.chat(text));
}

/* ------------------------------------------------ */
/* MOVE */
export async function move(bot, { x, y, z }) {
  const goal = new GoalBlock(x, y, z);
  bot.pathfinder.setGoal(goal);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 30000);

    const check = () => {
      const pos = bot.entity.position;

      if (
        Math.abs(pos.x - x) < 1 &&
        Math.abs(pos.y - y) < 2 &&
        Math.abs(pos.z - z) < 1
      ) {
        clearTimeout(timeout);
        bot.removeListener("physicsTick", check);
        resolve(true);
      }
    };

    bot.on("physicsTick", check);
  });
}

/* ------------------------------------------------ */
/* DIG */
export async function dig(bot, { x, y, z }) {
  const block = bot.blockAt({ x, y, z });
  if (!block) return false;

  return safeExec(`dig ${block.name}`, () => bot.dig(block));
}

/* ------------------------------------------------ */
/* PLACE */
export async function place(bot, { x, y, z, item }) {
  const reference = bot.blockAt({ x, y, z });
  if (!reference) return false;

  const inventoryItem = bot.inventory.items().find((i) => i.name === item);
  if (!inventoryItem) return false;

  await bot.equip(inventoryItem, "hand");

  const direction = new Vec3(0, 1, 0);

  return safeExec(`place ${item}`, () =>
    bot.placeBlock(reference, direction)
  );
}

/* ------------------------------------------------ */
/* STATUS */
export async function status(bot) {
  const health = bot.health != null ? bot.health.toFixed(1) : "?";
  const food = bot.food != null ? bot.food : "?";

  const msg = `Health: ${health} | Food: ${food}`;
  return safeExec("status", () => bot.chat(msg));
}

/* ------------------------------------------------ */
/* INVENTORY */
export async function inventory(bot) {
  const items = bot.inventory.items();

  if (items.length === 0) {
    return safeExec("inventory", () => bot.chat("I have nothing"));
  }

  const list = items.map((i) => `${i.name}×${i.count}`).join(", ");
  return safeExec("inventory", () => bot.chat(`I have: ${list}`));
}

/* ------------------------------------------------ */
/* COMMAND RUNNER (AI compatible) */

export async function runCommand(bot, command) {

  if (!command || typeof command !== "object") {
    logger.warn("Invalid command from planner");
    return false;
  }

  const { action, params } = command;

  try {

    switch (action) {

      case "say":
        return await say(bot, params);

      case "move":
        return await move(bot, params);

      case "dig":
        return await dig(bot, params);

      case "place":
        return await place(bot, params);

      case "status":
        return await status(bot);

      case "inventory":
        return await inventory(bot);

      case "collect":
        bot.chat("Collecting nearby items...");
        return true;

      case "jump":
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 500);
        return true;

      case "stop":
        bot.clearControlStates();
        return true;

      default:
        logger.warn(`Unknown action: ${action}`);
        return false;
    }

  } catch (e) {

    logger.error(`Command execution failed: ${e.message}`);
    return false;

  }
}
