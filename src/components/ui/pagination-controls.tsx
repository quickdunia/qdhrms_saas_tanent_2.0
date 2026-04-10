import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (nextPage: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-3">
        <Button asChild disabled={page <= 1} size="sm" variant="outline">
          <Link aria-disabled={page <= 1} href={buildHref(Math.max(page - 1, 1))}>
            Previous
          </Link>
        </Button>
        <Button asChild disabled={page >= totalPages} size="sm" variant="outline">
          <Link aria-disabled={page >= totalPages} href={buildHref(Math.min(page + 1, totalPages))}>
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}
