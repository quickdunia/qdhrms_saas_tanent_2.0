import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  tenantId?: string | null;
  userId?: string | null;
  moduleKey: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  payload?: unknown;
}) {
  const headerList = headers();

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      moduleKey: input.moduleKey,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      payload: input.payload as object | undefined,
      ipAddress:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip") ??
        null,
      userAgent: headerList.get("user-agent"),
      deviceLabel: headerList.get("sec-ch-ua-platform"),
    },
  });
}
