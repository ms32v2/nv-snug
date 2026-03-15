# MindCraft – AI‑powered autonomous Minecraft player

Ronny is a bot that:

* logs in automatically (`/login cpmp0043`)
* thinks like a human using an LLM (OpenAI GPT‑4o‑mini by default)
* gathers resources, builds houses/farms, sleeps at night, and chats with other players
* can do a quick web‑search if it needs real‑world info

## 🚀 Quick start (local)

```bash
git clone https://github.com/<YOUR_USER>/mindcraft.git
cd mindcraft
npm ci
cp .env.example .env        # edit .env and paste your real secrets
npm run dev                  # or `npm start`

