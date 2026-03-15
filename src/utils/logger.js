
---

### 7️⃣ `src/utils/logger.js`

```js
import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

