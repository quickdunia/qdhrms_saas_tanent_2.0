import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.13),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_520px] lg:px-10">
        <section className="hidden rounded-[32px] bg-slate-950 p-10 text-white shadow-premium lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link className="inline-flex items-center gap-3" href="/">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{APP_NAME}</p>
                <p className="text-sm text-slate-400">Secure SaaS access</p>
              </div>
            </Link>
            <h1 className="mt-16 text-5xl font-semibold leading-tight tracking-tight">
              Enterprise access designed for secure, tenant-aware operations.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              Sign in, create passwords, and recover accounts through OTP-driven flows with
              session auditing, login history, and strong data isolation.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Password setup by OTP",
                description: "Super admins and tenant admins create passwords only after email verification.",
                icon: LockKeyhole,
              },
              {
                title: "Session visibility",
                description: "Track devices, IPs, recent activity, and revoke sessions in a controlled way.",
                icon: ShieldCheck,
              },
              {
                title: "Premium experience",
                description: "Responsive auth screens with polished, enterprise-grade visual treatment.",
                icon: Sparkles,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5" key={title}>
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center py-6">
          <div className="glass-panel w-full max-w-xl rounded-[32px] border border-white/70 p-6 shadow-premium sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
