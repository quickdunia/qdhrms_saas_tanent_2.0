"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/utils";

export async function revokeSessionAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/");

  try {
    const currentSession = await requireAuthenticatedSession();
    const sessionId = typeof rawData.sessionId === "string" ? rawData.sessionId : "";

    if (!sessionId) {
      redirectWithMessage(redirectTo, "error", "Session identifier is missing.");
    }

    const targetSession = await prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!targetSession) {
      redirectWithMessage(redirectTo, "error", "The selected session no longer exists.");
    }

    const isSuperAdmin = currentSession.user.role === Role.SUPER_ADMIN;
    const sameTenant =
      currentSession.tenant && targetSession.tenantId === currentSession.tenant.id;
    const canManageTenantSessions =
      currentSession.user.role === Role.TENANT_ADMIN || currentSession.user.role === Role.HR_MANAGER;

    if (
      !isSuperAdmin &&
      targetSession.id !== currentSession.session.id &&
      !(sameTenant && canManageTenantSessions)
    ) {
      redirect("/forbidden");
    }

    await prisma.authSession.update({
      where: {
        id: targetSession.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (targetSession.id === currentSession.session.id) {
      clearSessionCookie();
      redirect("/auth/login");
    }

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Session revoked successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to revoke the session."),
    );
  }
}
