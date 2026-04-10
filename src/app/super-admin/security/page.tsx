import { Activity, ShieldCheck } from "lucide-react";

import { RevokeSessionButton } from "@/components/forms/revoke-session-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminSecurityPage() {
  await requireSuperAdmin();

  const [sessions, loginAudits] = await Promise.all([
    prisma.authSession.findMany({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        tenant: true,
      },
    }),
    prisma.loginAudit.findMany({
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        tenant: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform security operations"
        description="Review active sessions, device metadata, login outcomes, and revoke risky sessions across the entire SaaS platform."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active and historical sessions</CardTitle>
            <CardDescription>
              Session records include tenant scope, IP address, browser details, and rolling activity timestamps.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TableContainer className="border-0 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{session.user.email}</p>
                        <p className="text-xs text-slate-500">{session.user.role.replaceAll("_", " ")}</p>
                      </TableCell>
                      <TableCell>{session.tenant?.name ?? "Platform scope"}</TableCell>
                      <TableCell>
                        <p>{session.deviceLabel ?? "Unknown device"}</p>
                        <p className="text-xs text-slate-500">{session.ipAddress ?? "IP unavailable"}</p>
                      </TableCell>
                      <TableCell>{formatDateTime(session.lastSeenAt)}</TableCell>
                      <TableCell>
                        <RevokeSessionButton redirectTo="/super-admin/security" sessionId={session.id} />
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
            <CardTitle>Latest login audit trail</CardTitle>
            <CardDescription>
              Success and failure events are captured with device context and tenant attribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginAudits.map((log) => (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={log.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                      {log.success ? <ShieldCheck className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{log.email}</p>
                      <p className="text-sm text-slate-500">
                        {log.tenant?.name ?? "Platform scope"} • {log.deviceLabel ?? "Unknown device"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={log.success ? "success" : "danger"}>
                    {log.success ? "Success" : "Failed"}
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
