// ai/planner.js
import axios from "axios";

export async function askPlanner(memory) {
  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: process.env.NVIDIA_MODEL || "meta/llama3-70b-instruct",
        messages: memory,
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
      }
    );

    const raw = response.data.choices[0].message.content.trim();
    try {
      return JSON.parse(raw);
    } catch {
      return { action: "say", params: { text: raw } };
    }
  } catch (e) {
    console.error("❌ NVIDIA API failed:", e.message);
    return { action: "say", params: { text: "I failed to plan my action 😅" } };
  }
}
