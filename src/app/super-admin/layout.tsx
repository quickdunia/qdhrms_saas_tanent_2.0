import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LogoutForm } from "@/components/layout/logout-form";
import { requireSuperAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSuperAdmin();
  const userLabel = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ");

  return (
    <DashboardShell
      actions={<LogoutForm />}
      brandName="QD HRMS Cloud"
      brandSubtitle="SaaS Super Admin"
      navItems={[
        { href: "/super-admin", label: "Overview", icon: "dashboard" },
        { href: "/super-admin/tenants", label: "Tenants", icon: "tenants" },
        { href: "/super-admin/security", label: "Security", icon: "security" },
        { href: "/super-admin/settings", label: "Platform", icon: "settings" },
      ]}
      userLabel={userLabel}
      userMeta={session.user.email}
    >
      {children}
    </DashboardShell>
  );
}
