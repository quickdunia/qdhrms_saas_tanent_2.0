import type { ReactNode } from "react";

import { Card, CardContent, CardDescription } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <CardDescription className="mt-3">{description}</CardDescription>
        </div>
        <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-[var(--brand)]">{icon}</div>
      </CardContent>
    </Card>
  );
}
