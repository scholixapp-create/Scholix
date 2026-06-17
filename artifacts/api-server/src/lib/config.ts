import { logger } from "./logger";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    logger.error(`Required environment variable missing: ${key}`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  const value = process.env[key];
  if (!value && fallback === "") {
    logger.warn(`Optional environment variable not set: ${key}`);
  }
  return value ?? fallback;
}

export const config = {
  port: Number(process.env["PORT"] ?? 8080),
  databaseUrl: requireEnv("DATABASE_URL"),
  resendApiKey: process.env["RESEND_API_KEY"] ?? null,
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3000"),
  sessionSecret: optionalEnv("SESSION_SECRET", ""),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  isProduction: process.env["NODE_ENV"] === "production",
} as const;

if (!config.resendApiKey) {
  logger.warn("RESEND_API_KEY not set — email notifications will be logged to console only");
}
