import { Role } from "@prisma/client";
import { Search, Users } from "lucide-react";

import { EmployeeForm } from "@/components/forms/employee-form";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, getSearchParamValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
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
    Role.DEPARTMENT_HEAD,
  ]);

  if (!hasTenantModuleAccess(session, "EMPLOYEES")) {
    return (
      <EmptyState
        description="Your current subscription does not include the employees module. Ask the SaaS super admin to upgrade the tenant plan."
        icon={<Users className="h-5 w-5" />}
        title="Employee module unavailable"
      />
    );
  }

  const q = getSearchParamValue(searchParams?.q);
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);

  const [colleges, branches, departments, managers, employees] = await Promise.all([
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
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.department.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.employee.findMany({
      where: {
        tenantId: session.tenant.id,
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
      take: 100,
      orderBy: {
        firstName: "asc",
      },
    }),
    prisma.employee.findMany({
      where: {
        tenantId: session.tenant.id,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { employeeCode: { contains: q } },
                { workEmail: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        branch: true,
        department: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={status} />
      <PageHeader
        title="Employees"
        description="Create and manage employee profiles with strict tenant-level data isolation."
      />

      <EmployeeForm
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        colleges={colleges.map((college) => ({ id: college.id, name: college.name }))}
        departments={departments.map((department) => ({ id: department.id, name: department.name }))}
        managers={managers}
        redirectTo={`/t/${params.tenantSlug}/employees`}
        tenantSlug={params.tenantSlug}
      />

      <form className="relative" method="get">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" defaultValue={q} name="q" placeholder="Search employee name, code, or work email" />
      </form>

      {employees.length === 0 ? (
        <EmptyState
          description="Create the first employee profile after defining the tenant organization structure."
          icon={<Users className="h-5 w-5" />}
          title="No employees yet"
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">
                      {[employee.firstName, employee.lastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-xs text-slate-500">{employee.employeeCode}</p>
                  </TableCell>
                  <TableCell>{employee.jobTitle}</TableCell>
                  <TableCell>{employee.department.name}</TableCell>
                  <TableCell>{employee.branch.name}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === "ACTIVE" ? "success" : "warning"}>
                      {employee.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(employee.joinDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
