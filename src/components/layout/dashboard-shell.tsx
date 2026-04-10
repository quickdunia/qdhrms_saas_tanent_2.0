"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Menu,
  Megaphone,
  Package,
  Plug,
  Settings,
  Shield,
  ShieldUser,
  UploadCloud,
  UserPlus,
  UserSquare2,
  Users,
  WalletCards,
  Waypoints,
  LineChart,
  LogOut,
  X,
} from "lucide-react";

import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: LayoutDashboard,
  organization: Waypoints,
  employees: Users,
  security: Shield,
  settings: Settings,
  subscriptions: WalletCards,
  tenants: Building2,
  usersAdmin: UserSquare2,
  roles: ShieldUser,
  attendance: CalendarCheck2,
  leave: CalendarDays,
  payroll: HandCoins,
  announcements: Megaphone,
  approvals: CheckCheck,
  notifications: Bell,
  imports: UploadCloud,
  selfService: UserPlus,
  recruitment: Briefcase,
  onboarding: UserPlus,
  offboarding: LogOut,
  assets: Package,
  helpdesk: LifeBuoy,
  forms: FileText,
  performance: BarChart3,
  training: GraduationCap,
  workflows: ListTodo,
  integrations: Plug,
  documents: FolderOpen,
  analytics: LineChart,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
  section?: string;
};

export function DashboardShell({
  brandName,
  brandSubtitle,
  logoUrl,
  navItems,
  userLabel,
  userMeta,
  actions,
  children,
}: {
  brandName: string;
  brandSubtitle: string;
  logoUrl?: string | null;
  navItems: NavItem[];
  userLabel: string;
  userMeta: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("qdhrms-sidebar-collapsed");
    setCollapsed(storedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("qdhrms-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.11),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.38)_1px,_transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.38)_1px,_transparent_1px)] bg-[size:42px_42px] opacity-40" />

      <div className="relative flex min-h-screen">
        {mobileOpen ? (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/60 bg-slate-950 text-white transition-all duration-300 lg:sticky lg:translate-x-0",
            collapsed ? "w-[92px]" : "w-[280px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark name={brandName} logoUrl={logoUrl} />
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{brandName}</p>
                  <p className="truncate text-xs text-slate-400">{brandSubtitle}</p>
                </div>
              ) : null}
            </div>
            <button
              className="hidden rounded-2xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              className="rounded-2xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navItems.map((item, index) => {
              const Icon = iconMap[item.icon];
              const active =
                pathname === item.href ||
                (item.href !== "/super-admin" && pathname.startsWith(`${item.href}/`));
              const previousSection = navItems[index - 1]?.section;
              const showSection = Boolean(item.section && item.section !== previousSection);

              return (
                <div key={item.href}>
                  {showSection && !collapsed ? (
                    <p className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {item.section}
                    </p>
                  ) : null}
                  <Link
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-white text-slate-950 shadow-lg"
                        : "text-slate-300 hover:bg-white/8 hover:text-white",
                    )}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-[var(--brand)]" : "")} />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-3xl bg-white/8 p-4">
              <p className={cn("font-medium", collapsed ? "sr-only" : "text-sm")}>{userLabel}</p>
              {!collapsed ? <p className="mt-1 text-xs text-slate-400">{userMeta}</p> : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Button
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Enterprise Workspace
                  </p>
                  <p className="text-base font-semibold text-slate-950 sm:text-lg">{brandName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">{actions}</div>
            </div>
          </header>

          <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
