import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import type { ModuleKey, PermissionAction } from "@/lib/auth/constants";
import {
  canPerformAction,
  hasModuleAccess,
  resolvePermissionSet,
} from "@/lib/auth/permissions";
import { getAuthenticatedSession } from "@/lib/auth/sessions";
import type { AppSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export async function requireAuthenticatedSession(): Promise<AppSession> {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/auth/login");
  }

  return session;
}

export async function requireSuperAdmin(): Promise<AppSession> {
  const session = await requireAuthenticatedSession();

  if (session.user.role !== Role.SUPER_ADMIN) {
    redirect("/forbidden");
  }

  return session;
}

export async function requireTenantAccess(
  tenantSlug: string,
  allowedRoles?: Role[],
): Promise<AppSession & { tenant: NonNullable<AppSession["tenant"]> }> {
  const session = await requireAuthenticatedSession();

  if (session.user.role === Role.SUPER_ADMIN) {
    redirect("/super-admin");
  }

  if (!session.tenant || session.tenant.slug !== tenantSlug) {
    redirect("/forbidden");
  }

  if (["SUSPENDED", "HOLD", "DELETED"].includes(session.tenant.status)) {
    redirect("/forbidden");
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect("/forbidden");
  }

  return session as AppSession & { tenant: NonNullable<AppSession["tenant"]> };
}

export function hasTenantModuleAccess(session: Awaited<ReturnType<typeof requireTenantAccess>>, moduleKey: ModuleKey) {
  if (!session.tenant) {
    return false;
  }

  return hasModuleAccess(session.user.role, session.tenant.allowedModules, moduleKey);
}

export async function requireTenantModulePermission(
  tenantSlug: string,
  moduleKey: ModuleKey,
  action: PermissionAction,
  allowedRoles?: Role[],
) {
  const session = await requireTenantAccess(tenantSlug, allowedRoles);

  if (!hasTenantModuleAccess(session, moduleKey)) {
    redirect("/forbidden");
  }

  const override = await prisma.rolePermission.findUnique({
    where: {
      tenantId_role_moduleKey: {
        tenantId: session.tenant.id,
        role: session.user.role,
        moduleKey,
      },
    },
  });

  const permissionSet = resolvePermissionSet(session.user.role, moduleKey, override);

  if (!canPerformAction(permissionSet, action)) {
    redirect("/forbidden");
  }

  return session;
}
