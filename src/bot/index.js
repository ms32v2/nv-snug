// bot.js
import mineflayer from "mineflayer";
import { pathfinder, Movements, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { config } from "dotenv";
import { runCommand } from "./actions.js";
import { askPlanner } from "./ai/planner.js";

config();

const BOT_NAME = process.env.BOT_USERNAME || "Ronny";
const MC_HOST = process.env.MC_HOST || "localhost";
const MC_PORT = parseInt(process.env.MC_PORT, 10) || 25565;

let bot;

function createBot() {
  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: BOT_NAME,
  });

  bot.loadPlugin(pathfinder);

  bot.once("spawn", () => {
    console.log(`✅ Bot "${BOT_NAME}" spawned`);
    bot.chat("Hey! I am Ronny, an AI-powered bot.");
    humanIdle(); // start random human-like idle actions
  });

  bot.on("chat", async (username, message) => {
    if (username === bot.username) return;

    // Ask NVIDIA LLM what to do
    const action = await askPlanner([{ role: "user", content: message }]);
    await runCommand(bot, action);
  });

  bot.on("kicked", (reason) => {
    console.log(`❌ Kicked: ${reason}. Reconnecting in 5s...`);
    setTimeout(createBot, 5000);
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected. Reconnecting in 5s...");
    setTimeout(createBot, 5000);
  });

  bot.on("error", (err) => {
    console.error("❌ Bot error:", err.message);
  });
}

createBot();

// -----------------------------
// Human-like random idle actions
function humanIdle() {
  if (!bot || !bot.entity) return;

  const actions = ["jump", "lookAround", "walkRandom"];
  const choice = actions[Math.floor(Math.random() * actions.length)];

  switch (choice) {
    case "jump":
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 400 + Math.random() * 300);
      break;
    case "lookAround":
      bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI);
      break;
    case "walkRandom":
      const dx = (Math.random() - 0.5) * 5;
      const dz = (Math.random() - 0.5) * 5;
      const target = bot.entity.position.offset(dx, 0, dz);
      const defaultMove = new Movements(bot);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));
      break;
  }

  setTimeout(humanIdle, 3000 + Math.random() * 2000);
}
