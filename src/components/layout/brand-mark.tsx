/* eslint-disable @next/next/no-img-element */
import { Building2 } from "lucide-react";

import { getInitials } from "@/lib/utils";

export function BrandMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      <img
        alt={name}
        src={logoUrl}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/70"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-sm font-bold text-white">
      {getInitials(name) || <Building2 className="h-5 w-5" />}
    </div>
  );
}
