import { z } from "zod";

// Environment variables schema
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres").optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
});

// Validate and export environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);

    // Warning if using default JWT_SECRET in production
    if (env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      console.warn(
        "⚠️  WARNING: Using default JWT_SECRET in production is insecure. Set JWT_SECRET environment variable."
      );
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated env
export const env = validateEnv();
