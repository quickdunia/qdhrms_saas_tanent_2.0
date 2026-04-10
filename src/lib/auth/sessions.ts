import { addDays, differenceInMinutes } from "date-fns";

import { MODULE_KEYS } from "@/lib/auth/constants";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "@/lib/auth/cookies";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { resolveAllowedModules } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request";
import { synchronizeTenantSubscription } from "@/lib/tenant/subscriptions";

export async function recordLoginAudit(input: {
  userId?: string | null;
  tenantId?: string | null;
  email: string;
  success: boolean;
  reason?: string | null;
}) {
  const metadata = getRequestMetadata();

  await prisma.loginAudit.create({
    data: {
      userId: input.userId ?? null,
      tenantId: input.tenantId ?? null,
      email: input.email,
      success: input.success,
      reason: input.reason ?? null,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceLabel: metadata.deviceLabel,
    },
  });
}

export async function createUserSession(input: {
  id: string;
  email: string;
  role: AppSession["user"]["role"];
  tenantId: string | null;
  firstName: string;
  lastName: string | null;
}) {
  const metadata = getRequestMetadata();
  const env = getServerEnv();
  const expiresAt = addDays(new Date(), env.SESSION_MAX_AGE_DAYS);
  const tokenId = crypto.randomUUID();

  const session = await prisma.authSession.create({
    data: {
      userId: input.id,
      tenantId: input.tenantId,
      tokenId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceLabel: metadata.deviceLabel,
      expiresAt,
    },
  });

  const token = await signSessionToken({
    userId: input.id,
    email: input.email,
    role: input.role,
    tenantId: input.tenantId,
    sessionId: tokenId,
    firstName: input.firstName,
    lastName: input.lastName,
    expiresAt,
  });

  writeSessionCookie(token, expiresAt);

  return session;
}

export async function revokeCurrentSession() {
  const token = readSessionCookie();

  if (!token) {
    clearSessionCookie();
    return;
  }

  const payload = await verifySessionToken(token);

  if (payload) {
    await prisma.authSession.updateMany({
      where: {
        tokenId: payload.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  clearSessionCookie();
}

function buildTenantSession(record: Awaited<ReturnType<typeof fetchSessionRecord>>) {
  if (!record) {
    return null;
  }

  const subscription = record.user.tenant?.subscriptions[0] ?? null;
  const allowedModules =
    record.user.role === "SUPER_ADMIN"
      ? resolveAllowedModules(record.user.role, MODULE_KEYS)
      : resolveAllowedModules(
          record.user.role,
          subscription?.plan.moduleKeys,
          subscription?.moduleOverrides,
        );

  return {
    user: {
      id: record.user.id,
      email: record.user.email,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      role: record.user.role,
      status: record.user.status,
      tenantId: record.user.tenantId,
    },
    session: {
      id: record.id,
      tokenId: record.tokenId,
      createdAt: record.createdAt,
      lastSeenAt: record.lastSeenAt,
      expiresAt: record.expiresAt,
    },
    tenant: record.user.tenant
      ? {
          id: record.user.tenant.id,
          slug: record.user.tenant.slug,
          name: record.user.tenant.name,
          status: record.user.tenant.status,
          logoUrl: record.user.tenant.logoUrl,
          themeColor: record.user.tenant.themeColor,
          accentColor: record.user.tenant.accentColor,
          allowedModules,
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                planCode: subscription.plan.code,
                planName: subscription.plan.name,
                endsAt: subscription.endsAt,
              }
            : null,
        }
      : null,
  } satisfies AppSession;
}

async function fetchSessionRecord(tokenId: string) {
  return prisma.authSession.findUnique({
    where: {
      tokenId,
    },
    include: {
      user: {
        include: {
          tenant: {
            include: {
              subscriptions: {
                where: {
                  status: {
                    in: ["TRIAL", "ACTIVE", "PAST_DUE"],
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAuthenticatedSession() {
  const token = readSessionCookie();

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const record = await fetchSessionRecord(payload.sessionId);

  if (!record) {
    return null;
  }

  const isExpired = record.expiresAt <= new Date();
  const isRevoked = Boolean(record.revokedAt);
  const isUserBlocked = ["SUSPENDED", "LOCKED"].includes(record.user.status);

  if (isExpired || isRevoked || isUserBlocked || payload.sub !== record.userId) {
    return null;
  }

  if (differenceInMinutes(new Date(), record.lastSeenAt) >= 5) {
    await prisma.authSession.update({
      where: {
        id: record.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }

  if (record.user.tenantId) {
    const subscription = await synchronizeTenantSubscription(record.user.tenantId);

    if (subscription?.status === "EXPIRED" && record.user.role !== "SUPER_ADMIN") {
      return null;
    }
  }

  return buildTenantSession(record);
}

export function getDefaultRedirectForUser(session: AppSession) {
  if (session.user.role === "SUPER_ADMIN") {
    return "/super-admin";
  }

  if (session.tenant?.slug) {
    return `/t/${session.tenant.slug}`;
  }

  return "/auth/login";
}
