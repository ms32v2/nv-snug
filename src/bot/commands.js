// src/bot/commands.js
import { Bot } from "mineflayer";

/**
 * Executes a structured command returned by the LLM.
 * @param {Bot} bot
 * @param {{action:string, params:any}} cmd
 */
export async function runCommand(bot, cmd) {
  const { action, params } = cmd;

  switch (action) {
    case "say":
      bot.chat(params.text);
      break;

    case "move":
      // params: {x:number, y:number, z:number}
      bot.pathfinder?.setGoal(
        new GoalBlock(params.x, params.y, params.z)
      );
      break;

    case "dig":
      // params: {x:number, y:number, z:number}
      const block = bot.blockAt(params);
      if (block) bot.dig(block);
      break;

    case "place":
      // params: {x,y,z, itemName}
      const reference = bot.blockAt(params);
      const item = bot.inventory.findInventoryItem(params.itemName);
      if (reference && item) await bot.placeBlock(reference, reference.face);
      break;

    case "collect":
      // simple “go to coordinates and pick up any dropped items”
      // You could extend this with pathfinder goals.
      bot.chat(`I’m heading to ${params.x},${params.y},${params.z} to collect`);
      // implementation left as an exercise…
      break;

    case "status":
      bot.chat(`Health: ${bot.health.toFixed(1)} | Food: ${bot.food}`);
      break;

    case "inventory":
      const list = bot.inventory.items()
        .map(i => `${i.name}×${i.count}`)
        .join(", ");
      bot.chat(`I have: ${list || "nothing"}`);
      break;

    case "custom":
      // For any special extensions you add later.
      if (typeof params.fn === "function") await params.fn(bot);
      break;

    default:
      bot.chat(`I don’t know how to "${action}"`);
  }
}

