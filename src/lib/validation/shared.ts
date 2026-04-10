import { z } from "zod";

export const safeRedirectSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/";
    }

    return value;
  });

export const optionalTextSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

export const optionalEmailSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: "Please enter a valid email address.",
  });

export const optionalUrlSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)
  .refine((value) => !value || z.string().url().safeParse(value).success, {
    message: "Please enter a valid URL.",
  });

export const hexColorSchema = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
  message: "Use a valid hex color like #0f766e.",
});
