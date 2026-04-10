import { Role } from "@prisma/client";
import { Search, Waypoints } from "lucide-react";

import { DepartmentForm } from "@/components/forms/department-form";
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

export default async function DepartmentsPage({
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

  const [branches, departments] = await Promise.all([
    prisma.branch.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.department.findMany({
      where: {
        tenantId: session.tenant.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        branch: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />
      <PageHeader
        title="Departments"
        description="Manage operational departments within the tenant’s branches and campuses."
      />

      <DepartmentForm
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name, code: branch.code }))}
        redirectTo={`/t/${params.tenantSlug}/departments`}
        tenantSlug={params.tenantSlug}
      />

      <form className="relative" method="get">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" defaultValue={q} name="q" placeholder="Search departments or codes" />
      </form>

      {departments.length === 0 ? (
        <EmptyState
          description="Create the first department after branches or campuses have been defined."
          icon={<Waypoints className="h-5 w-5" />}
          title="No departments yet"
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-semibold text-slate-900">{department.name}</TableCell>
                  <TableCell>{department.branch.name}</TableCell>
                  <TableCell>{department.code}</TableCell>
                  <TableCell>{department.description ?? "No description"}</TableCell>
                  <TableCell>{formatDateTime(department.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
