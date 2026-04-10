import { OtpPurpose } from "@prisma/client";
import { z } from "zod";

import { safeRedirectSchema } from "@/lib/validation/shared";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(64, "Password must not exceed 64 characters.")
  .regex(/[A-Z]/, "Add at least one uppercase letter.")
  .regex(/[a-z]/, "Add at least one lowercase letter.")
  .regex(/[0-9]/, "Add at least one number.")
  .regex(/[^A-Za-z0-9]/, "Add at least one special character.");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  redirectTo: safeRedirectSchema,
});

export const requestOtpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  purpose: z.nativeEnum(OtpPurpose),
  redirectTo: safeRedirectSchema,
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address."),
    purpose: z.nativeEnum(OtpPurpose),
    code: z.string().trim().length(6, "Enter the 6-digit OTP."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
    redirectTo: safeRedirectSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
