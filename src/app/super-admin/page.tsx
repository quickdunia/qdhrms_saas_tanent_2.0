import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CreditCard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSuperAdminOverview } from "@/lib/data/dashboard";
import { formatDateTime, getSearchParamValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const overview = await getSuperAdminOverview();
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />

      <PageHeader
        title="SaaS command center"
        description="Monitor tenant growth, login activity, onboarding health, and subscription distribution across the platform."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href="/super-admin/security">Review security</Link>
            </Button>
            <Button asChild size="sm" variant="brand">
              <Link href="/super-admin/tenants">
                Manage tenants
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="All provisioned tenant workspaces"
          icon={<Building2 className="h-5 w-5" />}
          label="Total tenants"
          value={overview.totalTenants}
        />
        <StatCard
          description="Tenants currently in active service"
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Active tenants"
          value={overview.activeTenants}
        />
        <StatCard
          description="Employee records stored across all tenants"
          icon={<Users className="h-5 w-5" />}
          label="Employees"
          value={overview.totalEmployees}
        />
        <StatCard
          description="Tenant admins still waiting to finish setup"
          icon={<CreditCard className="h-5 w-5" />}
          label="Pending admins"
          value={overview.pendingAdmins}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Newest tenant workspaces</CardTitle>
            <CardDescription>
              Recently provisioned tenants with their latest subscription assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TableContainer className="border-0 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-500">{tenant.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>{tenant.type.replaceAll("_", " ")}</TableCell>
                      <TableCell>
                        {tenant.subscriptions[0]?.plan.name ?? "No plan"}
                      </TableCell>
                      <TableCell>{formatDateTime(tenant.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform quick view</CardTitle>
            <CardDescription>High-signal operational indicators for the current platform state.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Subscription catalog</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{overview.planCount}</p>
              <p className="mt-2 text-sm text-slate-500">Plans currently available for tenant assignment.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Latest login activity</p>
              <div className="mt-3 space-y-3">
                {overview.recentLogins.slice(0, 4).map((log) => (
                  <div className="flex items-start gap-3" key={log.id}>
                    <div className="rounded-2xl bg-[var(--brand-soft)] p-2 text-[var(--brand)]">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {log.email} {log.success ? "signed in" : "failed to sign in"}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
