import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Briefcase,
  Building2,
  Clock3,
  FileSpreadsheet,
  FolderOpen,
  LifeBuoy,
  Network,
  ShieldCheck,
  UserPlus,
  Users2,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { hasTenantModuleAccess, requireTenantAccess } from "@/lib/auth/guards";
import { getTenantOverview } from "@/lib/data/dashboard";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage({
  params,
}: {
  params: { tenantSlug: string };
}) {
  const session = await requireTenantAccess(params.tenantSlug);
  const overview = await getTenantOverview({
    tenantId: session.tenant.id,
    userId: session.user.id,
    role: session.user.role,
  });
  const focusMetricIcons: Record<string, ReactNode> = {
    "unread-notifications": <BellRing className="h-5 w-5" />,
    "active-sessions": <ShieldCheck className="h-5 w-5" />,
    "attendance-month": <Clock3 className="h-5 w-5" />,
    "leave-pending": <CalendarClock className="h-5 w-5" />,
    "leave-balance": <ClipboardCheck className="h-5 w-5" />,
    "latest-pay": <WalletCards className="h-5 w-5" />,
    "draft-runs": <FileSpreadsheet className="h-5 w-5" />,
    "approval-runs": <ShieldCheck className="h-5 w-5" />,
    "processed-runs": <ClipboardCheck className="h-5 w-5" />,
    "month-payout": <WalletCards className="h-5 w-5" />,
    headcount: <Users2 className="h-5 w-5" />,
    "approval-queue": <ShieldCheck className="h-5 w-5" />,
    "leave-queue": <CalendarClock className="h-5 w-5" />,
    "attendance-queue": <Clock3 className="h-5 w-5" />,
    employees: <Users2 className="h-5 w-5" />,
    sessions: <ShieldCheck className="h-5 w-5" />,
    alerts: <BellRing className="h-5 w-5" />,
    documents: <FolderOpen className="h-5 w-5" />,
  };
  const quickLinks = [
    {
      allowed: hasTenantModuleAccess(session, "SELF_SERVICE"),
      href: `/t/${params.tenantSlug}/self-service`,
      title: "Self service",
      description: "Attendance, leave, announcements, and notifications in one employee-ready hub.",
    },
    {
      allowed: hasTenantModuleAccess(session, "APPROVALS"),
      href: `/t/${params.tenantSlug}/approvals`,
      title: "Approvals",
      description: "Work through attendance, leave, and payroll actions that need approval.",
    },
    {
      allowed: hasTenantModuleAccess(session, "PAYROLL"),
      href: `/t/${params.tenantSlug}/payroll`,
      title: "Payroll",
      description: "Generate payroll runs, inspect payslips, and export finance-ready data.",
    },
    {
      allowed: hasTenantModuleAccess(session, "RECRUITMENT"),
      href: `/t/${params.tenantSlug}/recruitment`,
      title: "Recruitment",
      description: "Review open roles, candidate flow, interview momentum, and hiring readiness.",
    },
    {
      allowed: hasTenantModuleAccess(session, "HELPDESK"),
      href: `/t/${params.tenantSlug}/helpdesk`,
      title: "Helpdesk",
      description: "Track employee issues, ownership, escalations, and service backlog health.",
    },
    {
      allowed: hasTenantModuleAccess(session, "SETTINGS"),
      href: `/t/${params.tenantSlug}/settings`,
      title: "Settings",
      description: "Update tenant branding, module controls, subscription visibility, and governance.",
    },
  ].filter((link) => link.allowed);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${session.tenant.name} workspace`}
        description="Track organization growth, monitor employee setup, and stay on top of access and security activity from one tenant-aware dashboard."
        actions={
          <>
            {hasTenantModuleAccess(session, "EMPLOYEES") ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/t/${params.tenantSlug}/employees`}>Manage employees</Link>
              </Button>
            ) : null}
            {hasTenantModuleAccess(session, "SETTINGS") ? (
              <Button asChild size="sm" variant="brand">
                <Link href={`/t/${params.tenantSlug}/settings`}>
                  Tenant settings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="Employees currently registered in this tenant workspace"
          icon={<Users2 className="h-5 w-5" />}
          label="Employees"
          value={overview.employeeCount}
        />
        <StatCard
          description="Total colleges or units in this tenant hierarchy"
          icon={<Building2 className="h-5 w-5" />}
          label="Colleges"
          value={overview.collegeCount}
        />
        <StatCard
          description="Branch offices, campuses, or field locations"
          icon={<Network className="h-5 w-5" />}
          label="Branches"
          value={overview.branchCount}
        />
        <StatCard
          description="Department records linked inside tenant branches"
          icon={<Network className="h-5 w-5" />}
          label="Departments"
          value={overview.departmentCount}
        />
        <StatCard
          description="Currently active non-revoked sessions"
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Sessions"
          value={overview.activeSessionCount}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {hasTenantModuleAccess(session, "RECRUITMENT") ? (
          <StatCard
            description="Open requisitions currently active in the recruitment pipeline"
            icon={<Briefcase className="h-5 w-5" />}
            label="Open jobs"
            value={overview.openJobCount}
          />
        ) : null}
        {hasTenantModuleAccess(session, "ONBOARDING") ? (
          <StatCard
            description="Onboarding plans that still require completion or follow-up"
            icon={<UserPlus className="h-5 w-5" />}
            label="Onboarding"
            value={overview.onboardingCount}
          />
        ) : null}
        {hasTenantModuleAccess(session, "HELPDESK") ? (
          <StatCard
            description="Unresolved employee tickets and grievance cases"
            icon={<LifeBuoy className="h-5 w-5" />}
            label="Helpdesk"
            value={overview.helpdeskOpenCount}
          />
        ) : null}
        {hasTenantModuleAccess(session, "DOCUMENT_VAULT") ? (
          <StatCard
            description="Documents stored in the governed tenant vault"
            icon={<FolderOpen className="h-5 w-5" />}
            label="Vault docs"
            value={overview.documentCount}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              {overview.roleHighlights.eyebrow}
            </p>
            <CardTitle className="mt-2">{overview.roleHighlights.title}</CardTitle>
            <CardDescription>{overview.roleHighlights.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {overview.roleHighlights.metrics.map((metric) => (
                <div
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={metric.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-[var(--brand)]">
                      {focusMetricIcons[metric.id] ?? <Briefcase className="h-5 w-5" />}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{metric.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base">{overview.roleHighlights.detailTitle}</CardTitle>
                  <CardDescription className="mt-1">
                    {overview.roleHighlights.detailDescription}
                  </CardDescription>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {overview.roleHighlights.detailItems.map((item) => (
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-4" key={`${item.label}-${item.value}`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                    {item.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace shortcuts</CardTitle>
            <CardDescription>
              Fast entry points into the modules that matter most for your current role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickLinks.length > 0 ? (
              quickLinks.map((link) => (
                <Link
                  className="block rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                  href={link.href}
                  key={link.href}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{link.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{link.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                description="Shortcuts will appear once modules are enabled for this tenant and role."
                title="No quick actions available"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subscription and access profile</CardTitle>
            <CardDescription>
              Current plan controls which modules are available across this tenant workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {session.tenant.subscription?.planName ?? "Unassigned"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Code: {session.tenant.subscription?.planCode ?? "N/A"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <div className="mt-3">
                <Badge
                  variant={
                    session.tenant.subscription?.status === "ACTIVE"
                      ? "success"
                      : session.tenant.subscription?.status === "TRIAL"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {session.tenant.subscription?.status.replaceAll("_", " ") ?? "No subscription"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Ends: {formatDate(session.tenant.subscription?.endsAt)}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Enabled modules</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.tenant.allowedModules.map((moduleKey) => (
                  <Badge key={moduleKey} variant="brand">
                    {moduleKey.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest login activity</CardTitle>
            <CardDescription>
              Recent tenant-scoped login outcomes with timestamps for security visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.recentLogins.length > 0 ? (
              overview.recentLogins.slice(0, 5).map((log) => (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={log.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{log.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{log.deviceLabel ?? "Unknown device"}</p>
                    </div>
                    <Badge variant={log.success ? "success" : "danger"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                description="Login audits will appear here after the first successful or failed sign-in for this tenant."
                title="No login activity yet"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {(hasTenantModuleAccess(session, "RECRUITMENT") ||
        hasTenantModuleAccess(session, "ONBOARDING") ||
        hasTenantModuleAccess(session, "HELPDESK") ||
        hasTenantModuleAccess(session, "ADVANCED_ANALYTICS")) ? (
        <Card>
          <CardHeader>
            <CardTitle>Phase 2 workbench</CardTitle>
            <CardDescription>
              Quick entry points into the operational modules added for recruitment, onboarding,
              support, documents, and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {hasTenantModuleAccess(session, "RECRUITMENT") ? (
              <Link
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                href={`/t/${params.tenantSlug}/recruitment`}
              >
                <p className="text-sm font-semibold text-slate-950">Recruitment</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Manage openings, candidates, interviews, and conversion flows.
                </p>
              </Link>
            ) : null}
            {hasTenantModuleAccess(session, "ONBOARDING") ? (
              <Link
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                href={`/t/${params.tenantSlug}/onboarding`}
              >
                <p className="text-sm font-semibold text-slate-950">Onboarding</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Run joining checklists, login activation, and probation tracking.
                </p>
              </Link>
            ) : null}
            {hasTenantModuleAccess(session, "HELPDESK") ? (
              <Link
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                href={`/t/${params.tenantSlug}/helpdesk`}
              >
                <p className="text-sm font-semibold text-slate-950">Helpdesk</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Track grievance intake, ownership, resolution, and escalation flow.
                </p>
              </Link>
            ) : null}
            {hasTenantModuleAccess(session, "ADVANCED_ANALYTICS") ? (
              <Link
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white"
                href={`/t/${params.tenantSlug}/analytics`}
              >
                <p className="text-sm font-semibold text-slate-950">Advanced analytics</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Review cross-module trends and export live operational snapshots.
                </p>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasTenantModuleAccess(session, "EMPLOYEES") ? (
        <Card>
          <CardHeader>
            <CardTitle>Recently added employees</CardTitle>
            <CardDescription>
              Latest employee profiles created in this tenant workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.recentEmployees.length > 0 ? (
              <TableContainer className="border-0 shadow-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.recentEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <p className="font-semibold text-slate-900">
                            {[employee.firstName, employee.lastName].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-xs text-slate-500">{employee.employeeCode}</p>
                        </TableCell>
                        <TableCell>{employee.department.name}</TableCell>
                        <TableCell>{employee.branch.name}</TableCell>
                        <TableCell>{formatDate(employee.joinDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState
                description="New employee records will show up here once onboarding or employee creation starts."
                title="No recent employees yet"
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
