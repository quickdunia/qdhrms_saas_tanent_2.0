import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LogoutForm } from "@/components/layout/logout-form";
import { hasTenantModuleAccess, requireTenantAccess } from "@/lib/auth/guards";
import { CORE_MODULES, PHASE_TWO_MODULES } from "@/lib/modules/registry";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { getTenantThemeStyle } from "@/lib/tenant/theme";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { tenantSlug: string };
}) {
  const session = await requireTenantAccess(params.tenantSlug);
  const userLabel = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ");
  const baseHref = `/t/${params.tenantSlug}`;
  const navItems = [
    { href: baseHref, label: "Overview", icon: "dashboard" as const, section: "Core" },
    ...(hasTenantModuleAccess(session, "ORGANIZATION")
      ? [
          {
            href: `${baseHref}/colleges`,
            label: "Colleges",
            icon: "organization" as const,
            section: "Core",
          },
          {
            href: `${baseHref}/branches`,
            label: "Branches",
            icon: "organization" as const,
            section: "Core",
          },
          {
            href: `${baseHref}/departments`,
            label: "Departments",
            icon: "organization" as const,
            section: "Core",
          },
        ]
      : []),
    ...(hasTenantModuleAccess(session, "EMPLOYEES")
      ? [
          {
            href: `${baseHref}/employees`,
            label: "Employees",
            icon: "employees" as const,
            section: "Core",
          },
        ]
      : []),
    ...CORE_MODULES.filter((module) => hasTenantModuleAccess(session, module.key)).map((module) => ({
      href: `${baseHref}/${module.slug}`,
      label: module.label,
      icon: module.icon,
      section: module.section,
    })),
    ...PHASE_TWO_MODULES.filter((module) => hasTenantModuleAccess(session, module.key)).map((module) => ({
      href: `${baseHref}/${module.slug}`,
      label: module.label,
      icon: module.icon,
      section: module.section,
    })),
    ...(hasTenantModuleAccess(session, "SECURITY")
      ? [
          {
            href: `${baseHref}/security`,
            label: "Security",
            icon: "security" as const,
            section: "Platform",
          },
        ]
      : []),
    ...(hasTenantModuleAccess(session, "SETTINGS")
      ? [
          {
            href: `${baseHref}/settings`,
            label: "Settings",
            icon: "settings" as const,
            section: "Platform",
          },
        ]
      : []),
  ];

  return (
    <div style={getTenantThemeStyle(session.tenant.themeColor, session.tenant.accentColor)}>
      <DashboardShell
        actions={<LogoutForm />}
        brandName={session.tenant.name}
        brandSubtitle="Tenant workspace"
        logoUrl={session.tenant.logoUrl}
        navItems={navItems}
        userLabel={userLabel}
        userMeta={`${ROLE_LABELS[session.user.role]} • ${session.user.email}`}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
