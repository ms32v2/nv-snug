// actions.js
import { Vec3 } from "vec3";
import { goals, Movements } from "mineflayer-pathfinder";

function safeExec(name, fn) {
  return fn().then(() => console.log(`✅ ${name} executed`)).catch((e) => {
    console.warn(`❌ ${name} failed → ${e.message}`);
  });
}

export async function runCommand(bot, command) {
  if (!command || typeof command !== "object") return false;

  const { action, params } = command;

  try {
    switch (action) {
      case "say":
        return safeExec(`say "${params.text}"`, async () => bot.chat(params.text));
      case "move": {
        const { x, y, z } = params;
        const pos = new Vec3(x, y, z);
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
        return true;
      }
      case "dig": {
        const { x, y, z } = params;
        const pos = new Vec3(x, y, z);
        const block = bot.blockAt(pos);
        if (!block) return false;
        return safeExec(`dig ${block.name}`, async () => bot.dig(block));
      }
      case "place": {
        const { x, y, z, item } = params;
        const pos = new Vec3(x, y, z);
        const reference = bot.blockAt(pos);
        if (!reference) return false;
        const invItem = bot.inventory.items().find((i) => i.name === item);
        if (!invItem) return false;
        await bot.equip(invItem, "hand");
        return safeExec(`place ${item}`, async () => bot.placeBlock(reference, new Vec3(0, 1, 0)));
      }
      case "buildHouse":
        return bot.chat("🏠 I will build a simple house soon!"); // placeholder
      case "collect":
        return bot.chat("🟢 Collecting nearby items..."); // placeholder
      case "jump":
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 500);
        return true;
      case "stop":
        bot.clearControlStates();
        return true;
      default:
        console.warn(`Unknown action: ${action}`);
        return false;
    }
  } catch (e) {
    console.error(`Command execution failed: ${e.message}`);
    return false;
  }
}
