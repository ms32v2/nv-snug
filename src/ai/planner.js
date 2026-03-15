// src/ai/planner.js
import axios from "axios";
import { SYSTEM_PROMPT } from "./prompts.js";
import { serpSearch } from "./webSearch.js";
import { logger } from "../utils/logger.js";

async function callNvidia(messages) {
  const response = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model: process.env.NVIDIA_MODEL || "meta/llama3-70b-instruct",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      }
    }
  );
  return response.data.choices[0].message.content;
}

export async function askPlanner(memory) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...memory];
  const raw = (await callNvidia(messages))?.trim();
  logger.info(`LLM raw reply: ${raw}`);
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { action: "say", params: { text: raw } };
  }

  // Web search support
  if (parsed.action === "webSearch") {
    const result = await serpSearch(parsed.params.query);
    const followup = [
      { role: "system", content: SYSTEM_PROMPT },
      ...memory,
      { role: "assistant", content: raw },
      { role: "assistant", content: `Search result: ${result}` },
      { role: "user", content: "Based on results, return an action JSON." }
    ];
    const followRaw = (await callNvidia(followup))?.trim();
    try { parsed = JSON.parse(followRaw); } catch {
      parsed = { action: "say", params: { text: followRaw } };
    }
  }
  return parsed;
}
