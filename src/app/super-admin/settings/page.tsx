import { KeyRound, Server, WalletCards } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { getServerEnv, isMailConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuperAdminSettingsPage() {
  await requireSuperAdmin();

  const env = getServerEnv();
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: {
      priceMonthly: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform configuration"
        description="Review the super-admin credential source, mail readiness, and the active subscription catalog for tenant provisioning."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Super admin identity</CardTitle>
            <CardDescription>
              The platform owner account is sourced from environment variables for secure bootstrap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Name</p>
              <p className="mt-2 font-semibold text-slate-950">{env.SUPER_ADMIN_NAME}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
              <p className="mt-2 font-semibold text-slate-950">{env.SUPER_ADMIN_EMAIL}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">App URL</p>
              <p className="mt-2 font-semibold text-slate-950">{env.APP_URL}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email and OTP delivery</CardTitle>
            <CardDescription>
              Password creation and reset flows depend on SMTP-backed email delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <Server className="mt-1 h-5 w-5 text-[var(--brand)]" />
              <div>
                <p className="font-semibold text-slate-950">
                  {isMailConfigured() ? "SMTP configured" : "Fallback console delivery"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isMailConfigured()
                    ? `Host ${env.SMTP_HOST}:${env.SMTP_PORT} is ready for OTP and invite email delivery.`
                    : "SMTP environment values are missing, so OTP messages will be logged to the server console for local setup."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <KeyRound className="mt-1 h-5 w-5 text-[var(--brand)]" />
              <div>
                <p className="font-semibold text-slate-950">OTP and lockout policy</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  OTP expiry: {env.OTP_EXPIRY_MINUTES} minutes. Failed login limit: {env.MAX_FAILED_LOGINS}. Lock period: {env.ACCOUNT_LOCK_MINUTES} minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan catalog</CardTitle>
            <CardDescription>
              Every tenant receives plan-governed module access and subscription metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.map((plan) => (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={plan.id}>
                <div className="flex items-center gap-3">
                  <WalletCards className="h-5 w-5 text-[var(--brand)]" />
                  <div>
                    <p className="font-semibold text-slate-950">{plan.name}</p>
                    <p className="text-sm text-slate-500">{plan.code}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
