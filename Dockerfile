# ---------- Stage 1 – Build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source files
COPY . .

# ---------- Stage 2 – Runtime ----------
FROM node:20-alpine
WORKDIR /app

# Create a non‑root user (Render requires this)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/.env.example ./
COPY package.json .

ENV NODE_ENV=production

CMD ["node", "src/bot/index.js"]

