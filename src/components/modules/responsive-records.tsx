import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceRow } from "@/lib/data/phase-two";

export function ResponsiveRecords({
  rows,
}: {
  rows: WorkspaceRow[];
}) {
  const hasActions = rows.some((row) => row.action);

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {rows.map((row) => (
          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-premium" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{row.title}</p>
                {row.subtitle ? <p className="mt-1 text-sm text-slate-500">{row.subtitle}</p> : null}
              </div>
              {row.badge ? <Badge variant={row.badge.variant}>{row.badge.label}</Badge> : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {row.fields.map((field) => (
                <div key={`${row.id}-${field.label}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{field.label}</p>
                  <p className="mt-1 text-sm text-slate-700">{field.value}</p>
                </div>
              ))}
            </div>
            {row.action ? (
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={row.action.href}>{row.action.label}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                {hasActions ? <TableHead>Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-950">{row.title}</p>
                    {row.subtitle ? <p className="text-xs text-slate-500">{row.subtitle}</p> : null}
                  </TableCell>
                  <TableCell>{row.fields[0]?.value ?? "-"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {row.fields.slice(1).map((field) => (
                        <p className="text-sm text-slate-600" key={`${row.id}-${field.label}`}>
                          <span className="font-medium text-slate-900">{field.label}:</span> {field.value}
                        </p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.badge ? <Badge variant={row.badge.variant}>{row.badge.label}</Badge> : "-"}
                  </TableCell>
                  {hasActions ? (
                    <TableCell>
                      {row.action ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={row.action.href}>{row.action.label}</Link>
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
}
