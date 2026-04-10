import { Search, Users } from "lucide-react";

import { TenantCreateForm } from "@/components/forms/tenant-create-form";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getSearchParamValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminTenantsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireSuperAdmin();

  const q = getSearchParamValue(searchParams?.q);
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);

  const [plans, tenants] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: {
        priceMonthly: "asc",
      },
    }),
    prisma.tenant.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { slug: { contains: q } },
              { legalName: { contains: q } },
            ],
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        subscriptions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            plan: true,
          },
        },
        users: {
          where: {
            role: "TENANT_ADMIN",
          },
          take: 1,
        },
        _count: {
          select: {
            branches: true,
            colleges: true,
            departments: true,
            employees: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />

      <PageHeader
        title="Tenant lifecycle management"
        description="Create workspaces, manage tenant admins, review organizational scale, and adjust subscriptions without leaving the super-admin console."
      />

      <TenantCreateForm
        plans={plans.map((plan) => ({ id: plan.id, name: plan.name, code: plan.code }))}
        redirectTo="/super-admin/tenants"
      />

      <Card>
        <CardHeader>
          <CardTitle>Tenant directory</CardTitle>
          <CardDescription>
            Search and manage all provisioned organizations in one responsive control surface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="relative" method="get">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-11" defaultValue={q} name="q" placeholder="Search by tenant name, slug, or legal name" />
          </form>

          <div className="grid gap-5">
            {tenants.map((tenant) => {
              const latestSubscription = tenant.subscriptions[0];
              const tenantAdmin = tenant.users[0];

              return (
                <Card className="bg-slate-50/70" key={tenant.id}>
                  <CardContent className="grid gap-6 p-6 xl:grid-cols-[1fr_0.95fr]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-slate-950">{tenant.name}</h3>
                            <Badge
                              variant={
                                tenant.status === "ACTIVE"
                                  ? "success"
                                  : tenant.status === "TRIALING"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {tenant.status.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            {tenant.slug} • {tenant.type.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div
                          className="h-12 w-12 rounded-2xl border border-white shadow-sm"
                          style={{ backgroundColor: tenant.themeColor }}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Colleges</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant._count.colleges}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Branches</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant._count.branches}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Departments</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant._count.departments}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Employees</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant._count.employees}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white/90 p-5 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tenant admin</p>
                          <p className="mt-2 font-semibold text-slate-950">
                            {tenantAdmin
                              ? [tenantAdmin.firstName, tenantAdmin.lastName].filter(Boolean).join(" ")
                              : "Not assigned"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {tenantAdmin?.email ?? "Awaiting tenant admin assignment"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
                          <p className="mt-2 font-semibold text-slate-950">{formatDateTime(tenant.createdAt)}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Latest plan: {latestSubscription?.plan.name ?? "No subscription"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-[var(--brand)]">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">Subscription and modules</p>
                          <p className="text-sm text-slate-500">
                            Adjust plan assignment and override enabled tenant modules when needed.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <SubscriptionForm
                          currentModules={
                            Array.isArray(latestSubscription?.moduleOverrides)
                              ? (latestSubscription?.moduleOverrides as string[])
                              : Array.isArray(latestSubscription?.plan.moduleKeys)
                                ? (latestSubscription?.plan.moduleKeys as string[])
                                : []
                          }
                          currentPlanId={latestSubscription?.planId}
                          currentStatus={latestSubscription?.status}
                          plans={plans.map((plan) => ({ id: plan.id, name: plan.name, code: plan.code }))}
                          redirectTo="/super-admin/tenants"
                          tenantId={tenant.id}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
