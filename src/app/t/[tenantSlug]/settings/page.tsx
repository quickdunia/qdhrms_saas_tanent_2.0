import { Role } from "@prisma/client";
import { Paintbrush2, WalletCards } from "lucide-react";

import { TenantBrandingForm } from "@/components/forms/tenant-branding-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { PageHeader } from "@/components/ui/page-header";
import { hasTenantModuleAccess, requireTenantAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDate, getSearchParamValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantSettingsPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireTenantAccess(params.tenantSlug, [Role.TENANT_ADMIN]);

  if (!hasTenantModuleAccess(session, "SETTINGS")) {
    return (
      <EmptyState
        description="Your current subscription does not include the settings module. Ask the SaaS super admin to upgrade the tenant plan."
        icon={<Paintbrush2 className="h-5 w-5" />}
        title="Settings module unavailable"
      />
    );
  }

  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: session.tenant.id,
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
    },
  });

  if (!tenant) {
    return (
      <EmptyState
        description="The tenant settings could not be loaded."
        icon={<Paintbrush2 className="h-5 w-5" />}
        title="Tenant not found"
      />
    );
  }

  const latestSubscription = tenant.subscriptions[0];

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />
      <PageHeader
        title="Tenant settings"
        description="Customize tenant branding, organization profile, and subscription-aware presentation."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <TenantBrandingForm
          redirectTo={`/t/${params.tenantSlug}/settings`}
          tenant={{
            slug: tenant.slug,
            name: tenant.name,
            legalName: tenant.legalName,
            tagline: tenant.tagline,
            description: tenant.description,
            website: tenant.website,
            logoUrl: tenant.logoUrl,
            supportEmail: tenant.supportEmail,
            phone: tenant.phone,
            addressLine1: tenant.addressLine1,
            addressLine2: tenant.addressLine2,
            city: tenant.city,
            state: tenant.state,
            country: tenant.country,
            postalCode: tenant.postalCode,
            timezone: tenant.timezone,
            currency: tenant.currency,
            locale: tenant.locale,
            themeColor: tenant.themeColor,
            accentColor: tenant.accentColor,
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme preview</CardTitle>
              <CardDescription>
                The tenant workspace automatically picks up the saved logo and color palette.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div
                    className="h-14 w-14 rounded-2xl border border-white/10"
                    style={{ backgroundColor: tenant.themeColor }}
                  />
                  <div>
                    <p className="text-lg font-semibold">{tenant.name}</p>
                    <p className="text-sm text-slate-300">{tenant.tagline ?? "Tenant-branded workspace"}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm font-medium"
                    style={{ backgroundColor: tenant.themeColor }}
                  >
                    Primary color preview
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-950"
                    style={{ backgroundColor: tenant.accentColor }}
                  >
                    Accent color preview
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription summary</CardTitle>
              <CardDescription>
                The enabled modules below reflect the tenant’s latest subscription assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {latestSubscription?.plan.name ?? "Unassigned"}
                </p>
                <p className="mt-1 text-sm text-slate-500">{latestSubscription?.plan.code ?? "No code"}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <div className="mt-3">
                  <Badge
                    variant={
                      latestSubscription?.status === "ACTIVE"
                        ? "success"
                        : latestSubscription?.status === "TRIAL"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {latestSubscription?.status.replaceAll("_", " ") ?? "No subscription"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Ends: {formatDate(latestSubscription?.endsAt)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <WalletCards className="h-5 w-5 text-[var(--brand)]" />
                  <p className="font-semibold text-slate-950">Enabled modules</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.tenant.allowedModules.map((moduleKey) => (
                    <Badge key={moduleKey} variant="brand">
                      {moduleKey.replaceAll("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
