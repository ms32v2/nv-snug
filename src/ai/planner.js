import axios from "axios";
import { config } from "dotenv";
import { SYSTEM_PROMPT } from "./prompts.js";
import { serpSearch } from "./webSearch.js";
import { logger } from "../utils/logger.js";

config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

async function callNvidia(messages) {

  const response = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model: process.env.NVIDIA_MODEL || "meta/llama3-70b-instruct",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Ask the AI planner for the next action
 */
export async function askPlanner(memory) {

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...memory
  ];

  const raw = (await callNvidia(messages))?.trim();

  logger.info(`LLM raw reply: ${raw}`);

  let parsed;

  try {

    parsed = JSON.parse(raw);

  } catch {

    logger.warn("AI did not return JSON — fallback to chat");

    parsed = {
      action: "say",
      params: { text: raw }
    };

  }

  // If the AI wants a web search
  if (parsed.action === "webSearch") {

    const result = await serpSearch(parsed.params.query);

    const followMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...memory,
      { role: "assistant", content: raw },
      { role: "assistant", content: `Search result: ${result}` },
      {
        role: "user",
        content: "Based on the search result, return the next action JSON."
      }
    ];

    const followRaw = (await callNvidia(followMessages))?.trim();

    try {

      parsed = JSON.parse(followRaw);

    } catch {

      parsed = {
        action: "say",
        params: { text: followRaw }
      };

    }

  }

  return parsed;
}
