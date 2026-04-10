import { SubscriptionStatus, TenantStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const EXPIRABLE_STATUSES: SubscriptionStatus[] = ["TRIAL", "ACTIVE", "PAST_DUE"];

export async function synchronizeTenantSubscription(tenantId: string) {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tenant: true,
      plan: true,
    },
  });

  if (!subscription) {
    return null;
  }

  if (
    subscription.endsAt &&
    subscription.endsAt <= new Date() &&
    EXPIRABLE_STATUSES.includes(subscription.status)
  ) {
    await prisma.$transaction([
      prisma.tenantSubscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          status: "EXPIRED",
        },
      }),
      prisma.tenant.update({
        where: {
          id: tenantId,
        },
        data: {
          status: TenantStatus.SUSPENDED,
        },
      }),
    ]);

    return {
      ...subscription,
      status: "EXPIRED" as const,
      tenant: {
        ...subscription.tenant,
        status: TenantStatus.SUSPENDED,
      },
    };
  }

  return subscription;
}
