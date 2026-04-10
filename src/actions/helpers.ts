import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { ZodError } from "zod";

import { buildRedirectUrl } from "@/lib/utils";

export function resolveRedirectPath(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function redirectWithMessage(
  path: string,
  type: "success" | "error",
  message: string,
  extra?: Record<string, string | undefined>,
): never {
  redirect(
    buildRedirectUrl(path, {
      status: type,
      message,
      ...extra,
    }),
  );
}

export function rethrowIfRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A record with the same unique value already exists.";
    }

    if (error.code === "P2025") {
      return "The requested record could not be found.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
