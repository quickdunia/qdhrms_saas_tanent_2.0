"use server";

import { addMinutes } from "date-fns";
import { OtpPurpose, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { ensureSuperAdminUser } from "@/lib/auth/bootstrap";
import { issuePasswordOtp, consumePasswordOtp } from "@/lib/auth/otp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  recordLoginAudit,
  revokeCurrentSession,
} from "@/lib/auth/sessions";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/utils";
import {
  loginSchema,
  requestOtpSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export async function loginAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/auth/login");

  try {
    await ensureSuperAdminUser();

    const parsed = loginSchema.parse(rawData);
    const env = getServerEnv();
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      await recordLoginAudit({
        email: parsed.email,
        success: false,
        reason: "Invalid credentials",
      });

      redirectWithMessage(redirectTo, "error", "Invalid email or password.", {
        email: parsed.email,
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      await recordLoginAudit({
        userId: user.id,
        tenantId: user.tenantId,
        email: parsed.email,
        success: false,
        reason: "Account suspended",
      });

      redirectWithMessage(redirectTo, "error", "This account is suspended. Contact your administrator.");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await recordLoginAudit({
        userId: user.id,
        tenantId: user.tenantId,
        email: parsed.email,
        success: false,
        reason: "Account locked",
      });

      redirectWithMessage(
        redirectTo,
        "error",
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
        { email: parsed.email },
      );
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : user.status,
        },
      });
    }

    if (!user.passwordHash) {
      await recordLoginAudit({
        userId: user.id,
        tenantId: user.tenantId,
        email: parsed.email,
        success: false,
        reason: "Password not set",
      });

      redirectWithMessage(
        "/auth/create-password",
        "error",
        "Create your password first using email OTP.",
        { email: parsed.email },
      );
    }

    const passwordValid = await verifyPassword(parsed.password, user.passwordHash);

    if (!passwordValid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedLoginAttempts >= env.MAX_FAILED_LOGINS;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts,
          lockedUntil: shouldLock ? addMinutes(new Date(), env.ACCOUNT_LOCK_MINUTES) : null,
          status: shouldLock ? UserStatus.LOCKED : user.status,
        },
      });

      await recordLoginAudit({
        userId: user.id,
        tenantId: user.tenantId,
        email: parsed.email,
        success: false,
        reason: shouldLock ? "Account locked after failed attempts" : "Invalid credentials",
      });

      redirectWithMessage(redirectTo, "error", "Invalid email or password.", {
        email: parsed.email,
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await createUserSession({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await recordLoginAudit({
      userId: user.id,
      tenantId: user.tenantId,
      email: parsed.email,
      success: true,
    });

    if (parsed.redirectTo !== "/auth/login" && parsed.redirectTo !== "/") {
      redirect(parsed.redirectTo);
    }

    redirect(
      user.role === "SUPER_ADMIN"
        ? "/super-admin"
        : user.tenant?.slug
          ? `/t/${user.tenant.slug}`
          : "/auth/login",
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to sign in."));
  }
}

export async function requestPasswordOtpAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/auth/forgot-password");

  try {
    await ensureSuperAdminUser();

    const parsed = requestOtpSchema.parse(rawData);
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
      include: {
        tenant: true,
      },
    });

    const genericMessage =
      "If an eligible account exists, an OTP has been sent to the registered email address.";

    if (!user || user.status === UserStatus.SUSPENDED) {
      redirectWithMessage(redirectTo, "success", genericMessage, {
        email: parsed.email,
      });
    }

    const isCreatePassword = parsed.purpose === OtpPurpose.CREATE_PASSWORD;
    const alreadyConfigured = Boolean(user.passwordHash) && !user.mustSetPassword;

    if ((isCreatePassword && alreadyConfigured) || (!isCreatePassword && !user.passwordHash)) {
      redirectWithMessage(redirectTo, "success", genericMessage, {
        email: parsed.email,
      });
    }

    await issuePasswordOtp({
      user,
      purpose: parsed.purpose,
    });

    redirectWithMessage(redirectTo, "success", genericMessage, {
      email: parsed.email,
    });
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to send OTP right now."),
    );
  }
}

export async function resetPasswordWithOtpAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/auth/forgot-password");

  try {
    await ensureSuperAdminUser();

    const parsed = resetPasswordSchema.parse(rawData);
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      redirectWithMessage(redirectTo, "error", "No account was found for that email.", {
        email: parsed.email,
      });
    }

    if (
      parsed.purpose === OtpPurpose.CREATE_PASSWORD &&
      user.passwordHash &&
      !user.mustSetPassword
    ) {
      redirectWithMessage(
        "/auth/forgot-password",
        "error",
        "Password is already configured. Use forgot password instead.",
        { email: parsed.email },
      );
    }

    const token = await consumePasswordOtp({
      email: parsed.email,
      code: parsed.code,
      purpose: parsed.purpose,
    });

    if (!token) {
      redirectWithMessage(redirectTo, "error", "Invalid or expired OTP.", {
        email: parsed.email,
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: await hashPassword(parsed.password),
          mustSetPassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
          passwordChangedAt: new Date(),
        },
      }),
      prisma.authSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    redirectWithMessage("/auth/login", "success", "Password updated successfully. Please sign in.", {
      email: parsed.email,
    });
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to reset the password."),
      typeof rawData.email === "string" ? { email: rawData.email } : undefined,
    );
  }
}

export async function logoutAction() {
  await revokeCurrentSession();
  redirect("/auth/login");
}
