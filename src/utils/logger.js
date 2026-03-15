import winston from "winston";

const { combine, timestamp, printf } = winston.format;

const format = printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}] ${message}`;
});

export const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp(),
    format
  ),
  transports: [
    new winston.transports.Console()
  ]
});
