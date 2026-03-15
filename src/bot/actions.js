// src/bot/actions.js
import { GoalBlock } from "mineflayer-pathfinder";
import { logger } from "../utils/logger.js";

/* ------------------------------------------------------------------- */
/* Helper that logs success / failure and resolves to true/false */
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

/* ------------------------------------------------------------------- */
/* 1️⃣  Say something */
export async function say(bot, { text }) {
  return safeExec(`say "${text}"`, () => bot.chat(text));
}

/* ------------------------------------------------------------------- */
/* 2️⃣  Move to a coordinate */
export async function move(bot, { x, y, z }) {
  const goal = new GoalBlock(x, y, z);
  bot.pathfinder.setGoal(goal);

  // Resolve once within 1 block or after 30 s timeout
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 30_000);
    const check = () => {
      const pos = bot.entity.position;
      if (
        Math.abs(pos.x - x) < 1 &&
        Math.abs(pos.y - y) < 2 &&
        Math.abs(pos.z - z) < 1
      ) {
        clearTimeout(timeout);
        bot.removeListener("physicTick", check);
        resolve(true);
      }
    };
    bot.on("physicTick", check);
  });
}

/* ------------------------------------------------------------------- */
/* 3️⃣  Dig a block at a specific coordinate */
export async function dig(bot, { x, y, z }) {
  const block = bot.blockAt({ x, y, z });
  if (!block) return false;
  return safeExec(`dig ${block.name}`, () => bot.dig(block));
}

/* ------------------------------------------------------------------- */
/* 4️⃣  Collect dropped items / nearby ores */
export async function collect(bot, { radius = 10 }) {
  const { collectBlock } = await import("mineflayer-collect-block");
  return safeExec(`collect radius ${radius}`, async () => {
    await collectBlock(bot, { maxDistance: radius, timeout: 20_000 });
  });
}

/* ------------------------------------------------------------------- */
/* 5️⃣  Place a block from inventory */
export async function place(bot, { x, y, z, item }) {
  const reference = bot.blockAt({ x, y, z });
  if (!reference) return false;

  const inventoryItem = bot.inventory.items().find((i) => i.name === item);
  if (!inventoryItem) return false;

  // Equip the item in the hand
  await bot.equip(inventoryItem, "hand");

  // Use the face of the reference block as the placement direction
  const direction = reference.face || new Vec3(0, 1, 0);
  return safeExec(`place ${item} at ${x},${y},${z}`, () =>
    bot.placeBlock(reference, direction)
  );
}

/* ------------------------------------------------------------------- */
/* 6️⃣  Build a house from a JSON schematic (simple implementation) */
export async function buildHouse(bot, { template, origin }) {
  // Load the schematic file from assets/schematics/<template>.json
  // (dynamic import works with Node ≥ 14)
  const path = new URL(`../assets/schematics/${template}.json`, import.meta.url);
  const { default: schematic } = await import(path);

  // Iterate over every block in the schematic and place it
  for (const { x, y, z, blockId } of schematic) {
    const worldPos = {
      x: origin.x + x,
      y: origin.y + y,
      z: origin.z + z,
    };
    const blockInfo = bot.registry.blocks[blockId];
    if (!blockInfo) continue;

    const blockName = blockInfo.name;
    // Only place if the spot is currently air
    const existing = bot.blockAt(worldPos);
    if (existing && existing.type !== 0) continue;

    await place(bot, { ...worldPos, item: blockName });
  }
  return true;
}

/* ------------------------------------------------------------------- */
/* 7️⃣  Build a simple crop farm (wheat / carrot / potato) */
export async function buildFarm(bot, { type, origin, size = 5 }) {
  // 1️⃣  Equip a hoe (any type, we’ll just use wooden_hoe)
  const hoeItem = bot.inventory.items().find((i) => i.name.includes("hoe"));
  if (!hoeItem) {
    logger.warn("No hoe in inventory – cannot till soil");
    return false;
  }
  await bot.equip(hoeItem, "hand");

  // 2️⃣  Till the area
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      const target = {
        x: origin.x + dx,
        y: origin.y,
        z: origin.z + dz,
      };
      const block = bot.blockAt(target);
      if (!block) continue;
      // Right‑click with the hoe to create farmland
      await bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true);
      await bot.activateItem(); // hoe action
      await new Promise((r) => setTimeout(r, 200)); // tiny pause
    }
  }

  // 3️⃣  Plant seeds
  const seedName = `${type}_seeds`; // e.g., wheat_seeds
  const seedItem = bot.inventory.items().find((i) => i.name === seedName);
  if (!seedItem) {
    logger.warn(`No ${seedName} in inventory – cannot plant`);
    return false;
  }
  await bot.equip(seedItem, "hand");

  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      const target = {
        x: origin.x + dx,
        y: origin.y,
        z: origin.z + dz,
      };
      const farmland = bot.blockAt(target);
      if (!farmland || farmland.name !== "farmland") continue;

      // Right‑click the farmland with the seed
      await bot.lookAt(farmland.position.offset(0.5, 1, 0.5), true);
      await bot.activateItem(); // plant seed
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return true;
}

/* ------------------------------------------------------------------- */
/* 8️⃣  Sleep – go to the nearest bed and sleep */
export async function sleep(bot) {
  // Find the closest bed block (any colour)
  const bedPos = bot.findBlock({
    matching: (id) => bot.registry.blocks[id].name.includes("bed"),
    maxDistance: 30,
    count: 1,
  });

  if (!bedPos) {
    logger.warn("No bed found within 30 blocks");
    return false;
  }

  const { x, y, z } = bedPos.position;
  const moved = await move(bot, { x, y, z });
  if (!moved) return false;

  const bedBlock = bot.blockAt({ x, y, z });
  if (!bedBlock) return false;

  // Mineflayer's built‑in sleep helper
  await bot.sleep(bedBlock);
  return true;
}

/* ------------------------------------------------------------------- */
/* 9️⃣  Report status (health/food) */
export async function status(bot) {
  const msg = `Health: ${bot.health.toFixed(1)} | Food: ${bot.food}`;
  return safeExec("status", () => bot.chat(msg));
}

/* ------------------------------------------------------------------- */
/* 🔟  Show inventory */
export async function inventory(bot) {
  const items = bot.inventory.items();
  if (items.length === 0) {
    return safeExec("inventory", () => bot.chat("I have nothing"));
  }

  const list = items.map((i) => `${i.name}×${i.count}`).join(", ");
  return safeExec("inventory", () => bot.chat(`I have: ${list}`));
}

/* ------------------------------------------------------------------- */
/* 11️⃣  Custom / placeholder – you can hook any extra logic here */
export async function custom(bot, { fn }) {
  if (typeof fn === "function") {
    return safeExec("custom function", () => fn(bot));
  }
  return false;
}

