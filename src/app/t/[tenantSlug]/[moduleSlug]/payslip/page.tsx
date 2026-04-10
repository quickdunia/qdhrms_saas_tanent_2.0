import Link from "next/link";
import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { requireTenantModulePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function toItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as { name?: unknown; amount?: unknown };

      return {
        name: typeof item.name === "string" ? item.name : "Item",
        amount: Number(item.amount ?? 0),
      };
    })
    .filter((entry): entry is { name: string; amount: number } => Boolean(entry));
}

export default async function PayrollPayslipPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string; moduleSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (params.moduleSlug !== "payroll") {
    notFound();
  }

  const payrollItemId =
    typeof searchParams?.payrollItemId === "string" ? searchParams.payrollItemId : "";

  if (!payrollItemId) {
    notFound();
  }

  const session = await requireTenantModulePermission(params.tenantSlug, "PAYROLL", "view");
  const payrollItem = await prisma.payrollItem.findFirst({
    where: {
      id: payrollItemId,
      tenantId: session.tenant.id,
    },
    include: {
      employee: true,
      payrollRun: true,
      tenant: true,
    },
  });

  if (!payrollItem) {
    notFound();
  }

  if (
    session.user.role === Role.EMPLOYEE &&
    payrollItem.employee.userAccountId !== session.user.id
  ) {
    redirect("/forbidden");
  }

  const allowances = toItems(payrollItem.allowances);
  const deductions = toItems(payrollItem.deductions);
  const gross =
    Number(payrollItem.baseSalary) +
    allowances.reduce((total, item) => total + item.amount, 0) +
    Number(payrollItem.bonus) +
    Number(payrollItem.incentive);
  const totalDeductions =
    deductions.reduce((total, item) => total + item.amount, 0) +
    Number(payrollItem.loanDeduction) +
    Number(payrollItem.advanceDeduction);

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild size="sm" variant="outline">
          <Link href={`/t/${params.tenantSlug}/payroll`}>
            <ArrowLeft className="h-4 w-4" />
            Back to payroll
          </Link>
        </Button>
        <PrintButton label="Print payslip" />
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-premium print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Printable Payslip
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              {payrollItem.tenant.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Payroll period {payrollItem.payrollRun.month}/{payrollItem.payrollRun.year}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="brand">{payrollItem.payrollRun.status.replaceAll("_", " ")}</Badge>
            <p className="mt-3 text-sm font-medium text-slate-950">
              Payslip No. {payrollItem.payslipNumber ?? payrollItem.id}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Generated {formatDateTime(payrollItem.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-200 py-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Employee
            </p>
            <p className="mt-3 text-xl font-semibold text-slate-950">
              {[payrollItem.employee.firstName, payrollItem.employee.lastName].filter(Boolean).join(" ")}
            </p>
            <p className="mt-1 text-sm text-slate-500">{payrollItem.employee.employeeCode}</p>
            <p className="mt-4 text-sm text-slate-600">
              Job title: {payrollItem.employee.jobTitle}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Join date: {formatDate(payrollItem.employee.joinDate)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Bank and period
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Account holder: {payrollItem.bankAccountName ?? "-"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Account number: {payrollItem.bankAccountNumber ?? "-"}
            </p>
            <p className="mt-1 text-sm text-slate-600">IFSC: {payrollItem.ifscCode ?? "-"}</p>
            <p className="mt-4 text-sm text-slate-600">
              Attendance days: {String(payrollItem.attendanceDays)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Overtime minutes: {payrollItem.overtimeMinutes}
            </p>
          </div>
        </div>

        <div className="grid gap-6 py-8 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6">
            <p className="text-sm font-semibold text-emerald-800">Earnings</p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Base salary</span>
                <span>{formatCurrency(Number(payrollItem.baseSalary))}</span>
              </div>
              {allowances.map((allowance) => (
                <div className="flex items-center justify-between text-sm" key={allowance.name}>
                  <span>{allowance.name}</span>
                  <span>{formatCurrency(allowance.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span>Bonus</span>
                <span>{formatCurrency(Number(payrollItem.bonus))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Incentive</span>
                <span>{formatCurrency(Number(payrollItem.incentive))}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6">
            <p className="text-sm font-semibold text-rose-800">Deductions</p>
            <div className="mt-5 space-y-3">
              {deductions.map((deduction) => (
                <div className="flex items-center justify-between text-sm" key={deduction.name}>
                  <span>{deduction.name}</span>
                  <span>{formatCurrency(deduction.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span>Loan deduction</span>
                <span>{formatCurrency(Number(payrollItem.loanDeduction))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Advance deduction</span>
                <span>{formatCurrency(Number(payrollItem.advanceDeduction))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-8 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gross</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(gross)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deductions</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(totalDeductions)}
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--brand)] bg-[var(--brand-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Net pay</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(Number(payrollItem.netPay))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
