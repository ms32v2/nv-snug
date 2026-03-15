import { OpenAI } from "openai";
import { config } from "dotenv";
import { SYSTEM_PROMPT } from "./prompts.js";
import { serpSearch } from "./webSearch.js";
import { logger } from "../utils/logger.js";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Ask the LLM for the **next single action**.
 * @param {Array<{role:string, content:string}>} memory   – recent chat / system msgs
 * @returns {Promise<{action:string, params:any}>}
 */
export async function askPlanner(memory) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...memory,
  ];

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content?.trim();
  logger.info(`LLM raw reply: ${raw}`);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    logger.warn("LLM did not return valid JSON – falling back to talk");
    parsed = { action: "say", params: { text: raw } };
  }

  // If the LLM requested a web‑search, do it and ask again
  if (parsed.action === "webSearch") {
    const result = await serpSearch(parsed.params.query);
    const followUp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...memory,
        { role: "assistant", content: raw },                     // original request
        { role: "assistant", content: `Search result: ${result}` },
        {
          role: "user",
          content:
            "Based on the search result, give me the next normal action JSON.",
        },
      ],
      response_format: { type: "json_object" },
    });
    parsed = JSON.parse(followUp.choices[0].message.content?.trim());
  }

  return parsed;
}

