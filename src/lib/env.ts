import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z
    .string()
    .min(32)
    .default("change-me-development-auth-secret-1234567890"),
  OTP_SECRET: z.string().min(32).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPER_ADMIN_EMAIL: z.string().email().default("owner@example.com"),
  SUPER_ADMIN_NAME: z.string().min(1).default("Platform Owner"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("QD HRMS <no-reply@example.com>"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).max(10).default(5),
  ACCOUNT_LOCK_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(25).default(8),
  ALLOWED_IMAGE_MIME_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp"),
  ALLOWED_DOCUMENT_MIME_TYPES: z
    .string()
    .default(
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png",
    ),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({
    APP_URL: process.env.APP_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    OTP_SECRET: process.env.OTP_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SESSION_MAX_AGE_DAYS: process.env.SESSION_MAX_AGE_DAYS,
    OTP_EXPIRY_MINUTES: process.env.OTP_EXPIRY_MINUTES,
    MAX_FAILED_LOGINS: process.env.MAX_FAILED_LOGINS,
    ACCOUNT_LOCK_MINUTES: process.env.ACCOUNT_LOCK_MINUTES,
    MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB,
    ALLOWED_IMAGE_MIME_TYPES: process.env.ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_DOCUMENT_MIME_TYPES: process.env.ALLOWED_DOCUMENT_MIME_TYPES,
  });

  return cachedEnv;
}

export function isMailConfigured() {
  const env = getServerEnv();

  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
}

export function getAllowedUploadMimeTypes(kind: "image" | "document" | "mixed") {
  const env = getServerEnv();
  const imageMimeTypes = env.ALLOWED_IMAGE_MIME_TYPES.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const documentMimeTypes = env.ALLOWED_DOCUMENT_MIME_TYPES.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (kind === "image") {
    return imageMimeTypes;
  }

  if (kind === "document") {
    return documentMimeTypes;
  }

  return Array.from(new Set([...imageMimeTypes, ...documentMimeTypes]));
}
