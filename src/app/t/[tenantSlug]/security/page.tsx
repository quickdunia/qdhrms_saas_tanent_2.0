import { Role } from "@prisma/client";
import { Activity, ShieldCheck } from "lucide-react";

import { RevokeSessionButton } from "@/components/forms/revoke-session-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasTenantModuleAccess, requireTenantAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantSecurityPage({
  params,
}: {
  params: { tenantSlug: string };
}) {
  const session = await requireTenantAccess(params.tenantSlug, [Role.TENANT_ADMIN, Role.HR_MANAGER]);

  if (!hasTenantModuleAccess(session, "SECURITY")) {
    return (
      <EmptyState
        description="Your current subscription does not include the security module. Ask the SaaS super admin to upgrade the tenant plan."
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Security module unavailable"
      />
    );
  }

  const [sessions, loginAudits] = await Promise.all([
    prisma.authSession.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
      },
    }),
    prisma.loginAudit.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant security"
        description="Review user sessions, devices, IP addresses, and login outcomes for this tenant workspace."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Revoke stale or suspicious sessions while retaining full tenant isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TableContainer className="border-0 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((tenantSession) => (
                    <TableRow key={tenantSession.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{tenantSession.user.email}</p>
                        <p className="text-xs text-slate-500">
                          {tenantSession.user.role.replaceAll("_", " ")}
                        </p>
                      </TableCell>
                      <TableCell>{tenantSession.deviceLabel ?? "Unknown device"}</TableCell>
                      <TableCell>{tenantSession.ipAddress ?? "Unavailable"}</TableCell>
                      <TableCell>{formatDateTime(tenantSession.lastSeenAt)}</TableCell>
                      <TableCell>
                        <RevokeSessionButton
                          redirectTo={`/t/${params.tenantSlug}/security`}
                          sessionId={tenantSession.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login history</CardTitle>
            <CardDescription>
              Success and failure events are logged with user, device, and time metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginAudits.map((audit) => (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={audit.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                      {audit.success ? <ShieldCheck className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{audit.email}</p>
                      <p className="text-sm text-slate-500">{audit.deviceLabel ?? "Unknown device"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(audit.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={audit.success ? "success" : "danger"}>
                    {audit.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
