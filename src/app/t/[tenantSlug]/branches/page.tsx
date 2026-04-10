import { Role } from "@prisma/client";
import { Search, Waypoints } from "lucide-react";

import { BranchForm } from "@/components/forms/branch-form";
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

export default async function BranchesPage({
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

  const [colleges, branches] = await Promise.all([
    prisma.college.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.branch.findMany({
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
      include: {
        college: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />
      <PageHeader
        title="Branches and campuses"
        description="Create and manage branch offices, campuses, or field units under the tenant hierarchy."
      />

      <BranchForm
        colleges={colleges.map((college) => ({ id: college.id, name: college.name, code: college.code }))}
        redirectTo={`/t/${params.tenantSlug}/branches`}
        tenantSlug={params.tenantSlug}
      />

      <form className="relative" method="get">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" defaultValue={q} name="q" placeholder="Search branches, campuses, or codes" />
      </form>

      {branches.length === 0 ? (
        <EmptyState
          description="Add the first branch or campus once at least one college or unit exists."
          icon={<Waypoints className="h-5 w-5" />}
          title="No branches or campuses yet"
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{branch.name}</p>
                    <p className="text-xs text-slate-500">{branch.type.replaceAll("_", " ")}</p>
                  </TableCell>
                  <TableCell>{branch.college.name}</TableCell>
                  <TableCell>{branch.code}</TableCell>
                  <TableCell>
                    <p>{branch.email ?? "No email"}</p>
                    <p className="text-xs text-slate-500">{branch.phone ?? "No phone"}</p>
                  </TableCell>
                  <TableCell>{formatDateTime(branch.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
