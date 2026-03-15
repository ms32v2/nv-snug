// src/bot/chat.js
import { askPlanner } from "../ai/planner.js";
import { SYSTEM_PROMPT } from "../ai/prompts.js";
import { runCommand } from "./actions.js";
import { logger } from "../utils/logger.js";

/**
 * Attach a listener that sends every player message to the LLM.
 * The LLM returns a single JSON action, which we then execute.
 */
export function attachChatHandler(bot) {
  // Keep a short rolling window of the last few messages (to stay under token limits)
  const memory = [{ role: "system", content: SYSTEM_PROMPT }];

  bot.on("chat", async (username, message) => {
    if (username === bot.username) return; // ignore our own chatter

    logger.info(`💬 ${username}: ${message}`);
    memory.push({ role: "user", content: `${username}: ${message}` });

    // Trim to the most recent 12 entries (system + 11 msgs)
    if (memory.length > 12) memory.splice(2, memory.length - 12);

    try {
      const llmResult = await askPlanner(memory);
      await runCommand(bot, llmResult);
    } catch (err) {
      logger.error(`LLM error: ${err.message}`);
      bot.chat("Oops! Something went wrong with my brain.");
    }
  });
}

