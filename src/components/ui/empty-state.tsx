import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
        {icon ? (
          <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-[var(--brand)]">{icon}</div>
        ) : null}
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-xl">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
