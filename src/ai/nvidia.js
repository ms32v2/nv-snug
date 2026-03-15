import axios from "axios";

const API_KEY = process.env.NVIDIA_API_KEY;

export async function askNvidia(messages) {

  const response = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model: "meta/llama3-70b-instruct",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}
