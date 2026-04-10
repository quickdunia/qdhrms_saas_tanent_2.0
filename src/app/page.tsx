import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Fingerprint,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";

const featureCards = [
  {
    title: "True tenant isolation",
    description:
      "Every workspace, user, branch, department, and employee record is isolated through tenant-aware database design and guarded server-side access.",
    icon: ShieldCheck,
  },
  {
    title: "Organization hierarchy",
    description:
      "Model large institutions and distributed enterprises with unlimited colleges, units, branches, campuses, and departments.",
    icon: Waypoints,
  },
  {
    title: "Premium dashboards",
    description:
      "Responsive layouts, collapsible navigation, searchable data views, and polished enterprise-ready interactions across every screen size.",
    icon: LayoutDashboard,
  },
  {
    title: "Secure authentication",
    description:
      "Password creation and resets through OTP, JWT-backed sessions, failed login controls, audit trails, device history, and session management.",
    icon: Fingerprint,
  },
];

export default function HomePage() {
  const env = getServerEnv();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,_transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,_transparent_1px)] bg-[size:36px_36px]" />

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{APP_NAME}</p>
              <p className="text-sm text-slate-500">Multi-tenant HRMS SaaS platform</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/create-password">Create password</Link>
            </Button>
            <Button asChild size="sm" variant="brand">
              <Link href="/auth/login">Access dashboard</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              Production-ready Next.js 14 + Prisma 5 foundation
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Build and operate a premium HRMS SaaS for multi-campus and multi-unit organizations.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{APP_DESCRIPTION}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" variant="brand">
                <Link href="/auth/login">
                  Launch platform
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/auth/forgot-password">Recover account access</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--brand)]" />
                Super admin email from env: {env.SUPER_ADMIN_EMAIL}
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
                OTP-based password setup and reset
              </span>
            </div>
          </div>

          <div className="animate-fade-in">
            <Card className="overflow-hidden border-slate-200/80 bg-slate-950 text-white">
              <CardHeader>
                <CardTitle className="text-white">Platform highlights</CardTitle>
                <CardDescription className="text-slate-300">
                  Designed for colleges, institutions, companies, hospitals, and organization groups.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {[
                  "SaaS super admin with tenant provisioning and subscription control",
                  "Tenant branding with logo, theme color, profile, and regional settings",
                  "Role-based dashboards with secure session management and audit visibility",
                  "Real MySQL-backed hierarchy from tenant to department to employee",
                ].map((item) => (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="grid gap-6 pb-12 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <Card className="animate-fade-up" key={title}>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="pt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>
      </section>
    </main>
  );
}
