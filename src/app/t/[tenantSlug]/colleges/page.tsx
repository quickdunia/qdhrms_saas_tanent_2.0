import { Role } from "@prisma/client";
import { Search, Waypoints } from "lucide-react";

import { CollegeForm } from "@/components/forms/college-form";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasTenantModuleAccess, requireTenantAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getSearchParamValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CollegesPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireTenantAccess(params.tenantSlug, [
    Role.TENANT_ADMIN,
    Role.HR_MANAGER,
    Role.BRANCH_MANAGER,
  ]);

  if (!hasTenantModuleAccess(session, "ORGANIZATION")) {
    return (
      <EmptyState
        description="Your current subscription does not include the organization module. Ask the SaaS super admin to upgrade the tenant plan."
        icon={<Waypoints className="h-5 w-5" />}
        title="Organization module unavailable"
      />
    );
  }

  const q = getSearchParamValue(searchParams?.q);
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);

  const colleges = await prisma.college.findMany({
    where: {
      tenantId: session.tenant.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { code: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />
      <PageHeader
        title="Colleges and units"
        description="Manage the first level of the tenant hierarchy for institutions, groups, or distributed organizations."
      />

      <CollegeForm redirectTo={`/t/${params.tenantSlug}/colleges`} tenantSlug={params.tenantSlug} />

      <form className="relative" method="get">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" defaultValue={q} name="q" placeholder="Search colleges, units, or codes" />
      </form>

      {colleges.length === 0 ? (
        <EmptyState
          description="Create the first college or business unit to start building the hierarchy."
          icon={<Waypoints className="h-5 w-5" />}
          title="No colleges or units yet"
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colleges.map((college) => (
                <TableRow key={college.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{college.name}</p>
                    <p className="text-xs text-slate-500">{college.address ?? "Address not set"}</p>
                  </TableCell>
                  <TableCell>{college.code}</TableCell>
                  <TableCell>{college.type.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <p>{college.email ?? "No email"}</p>
                    <p className="text-xs text-slate-500">{college.phone ?? "No phone"}</p>
                  </TableCell>
                  <TableCell>{formatDateTime(college.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
