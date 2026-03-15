// src/bot/actions.js
import pkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { logger } from "../utils/logger.js";

const { GoalBlock } = pkg.goals;

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

// SAY
export async function say(bot, params = {}) {
  const text = params.text || "...";
  return safeExec(`say "${text}"`, () => bot.chat(text));
}

// MOVE
export async function move(bot, params = {}) {
  if (!bot.pathfinder || !bot.entity) return false;
  const { x = bot.entity.position.x, y = bot.entity.position.y, z = bot.entity.position.z } = params;
  const goalPos = new Vec3(x, y, z);
  bot.pathfinder.setGoal(new GoalBlock(goalPos.x, goalPos.y, goalPos.z));
  return true;
}

// DIG
export async function dig(bot, params = {}) {
  const { x, y, z } = params;
  if (x == null || y == null || z == null) return false;
  const pos = new Vec3(x, y, z);
  const block = bot.blockAt(pos);
  if (!block) return false;
  return safeExec(`dig ${block.name}`, () => bot.dig(block));
}

// PLACE
export async function place(bot, params = {}) {
  const { x, y, z, item } = params;
  if (!item) return false;
  const pos = new Vec3(x, y, z);
  const reference = bot.blockAt(pos);
  if (!reference) return false;
  const items = bot.inventory?.items?.() || [];
  const invItem = items.find((i) => i.name === item);
  if (!invItem) return false;
  await bot.equip(invItem, "hand");
  return safeExec(`place ${item}`, () => bot.placeBlock(reference, new Vec3(0, 1, 0)));
}

// STATUS
export async function status(bot) {
  const health = bot.health?.toFixed(1) ?? "?";
  const food = bot.food ?? "?";
  return safeExec("status", () => bot.chat(`Health: ${health} | Food: ${food}`));
}

// INVENTORY
export async function inventory(bot) {
  const items = bot.inventory?.items?.() || [];
  const list = items.length
    ? items.map((i) => `${i.name}×${i.count}`).join(", ")
    : "nothing";
  return safeExec("inventory", () => bot.chat(`I have: ${list}`));
}

// RUN COMMAND
export async function runCommand(bot, command) {
  if (!command || typeof command !== "object") return false;
  const { action, params } = command;
  try {
    switch (action) {
      case "say": return await say(bot, params);
      case "move": return await move(bot, params);
      case "dig": return await dig(bot, params);
      case "place": return await place(bot, params);
      case "status": return await status(bot);
      case "inventory": return await inventory(bot);
      case "collect":
        bot.chat("Looking for nearby items...");
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
