"use server";

import { differenceInMinutes, format } from "date-fns";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { requireTenantModulePermission } from "@/lib/auth/guards";
import { getAuthenticatedSession } from "@/lib/auth/sessions";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/files/upload";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { isTruthyFormValue, parseFormData } from "@/lib/utils";
import {
  createAnnouncementSchema,
  createHolidaySchema,
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  createPayrollRunSchema,
  createSalaryStructureSchema,
  createAttendanceRequestSchema,
  createAttendanceSchema,
  createShiftSchema,
  createNotificationSchema,
  createApprovalWorkflowSchema,
  updateRequestStatusSchema,
  updateTenantSettingsSchema,
} from "@/lib/validation/phase-one";

function buildRedirect(tenantSlug: string, path: string) {
  return `/t/${tenantSlug}/${path}`;
}

async function createApprovalTaskIfWorkflowExists(input: {
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  title: string;
  requestedById: string;
}) {
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      tenantId: input.tenantId,
      moduleKey: input.moduleKey,
      isActive: true,
    },
    include: {
      steps: {
        orderBy: {
          level: "asc",
        },
      },
    },
  });

  const firstStep = workflow?.steps[0];

  if (!workflow || !firstStep) {
    return null;
  }

  return prisma.approvalTask.create({
    data: {
      tenantId: input.tenantId,
      moduleKey: input.moduleKey,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      requestedById: input.requestedById,
      assignedRole: firstStep.role,
      assignedUserId: firstStep.userId,
      currentLevel: firstStep.level,
    },
  });
}

export async function createShiftAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "shifts"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "SHIFTS", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
      Role.BRANCH_MANAGER,
    ]);
    const parsed = createShiftSchema.parse(rawData);

    const shift = await prisma.shift.create({
      data: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        graceInMinutes: parsed.graceInMinutes,
        graceOutMinutes: parsed.graceOutMinutes,
        halfDayMinutes: parsed.halfDayMinutes,
        fullDayMinutes: parsed.fullDayMinutes,
        overtimeThresholdMinutes: parsed.overtimeThresholdMinutes,
        isFlexible: isTruthyFormValue(parsed.isFlexible),
        weeklyOffs: parsed.weeklyOffs.split(",").map((value) => value.trim()).filter(Boolean),
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "SHIFTS",
      action: "CREATE",
      entityType: "Shift",
      entityId: shift.id,
      summary: `Created shift ${shift.name}.`,
    });

    revalidatePath(buildRedirect(tenantSlug, "shifts"));
    redirectWithMessage(redirectTo, "success", `Shift ${shift.name} created successfully.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the shift."));
  }
}

export async function createAttendanceAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "attendance"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ATTENDANCE", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
      Role.BRANCH_MANAGER,
    ]);
    const parsed = createAttendanceSchema.parse(rawData);

    const employee = await prisma.employee.findFirst({
      where: {
        id: parsed.employeeId,
        tenantId: session.tenant.id,
      },
    });

    if (!employee) {
      redirectWithMessage(redirectTo, "error", "Employee not found.");
    }

    const checkInAt = parsed.checkInAt ? new Date(parsed.checkInAt) : null;
    const checkOutAt = parsed.checkOutAt ? new Date(parsed.checkOutAt) : null;
    const workMinutes =
      checkInAt && checkOutAt ? Math.max(differenceInMinutes(checkOutAt, checkInAt), 0) : 0;

    const shift = parsed.shiftId
      ? await prisma.shift.findFirst({
          where: {
            id: parsed.shiftId,
            tenantId: session.tenant.id,
          },
        })
      : null;

    const lateMinutes =
      shift && checkInAt
        ? Math.max(
            differenceInMinutes(
              checkInAt,
              new Date(`${parsed.attendanceDate}T${shift.startTime}:00`),
            ) - shift.graceInMinutes,
            0,
          )
        : 0;
    const earlyExitMinutes =
      shift && checkOutAt
        ? Math.max(
            differenceInMinutes(
              new Date(`${parsed.attendanceDate}T${shift.endTime}:00`),
              checkOutAt,
            ) - shift.graceOutMinutes,
            0,
          )
        : 0;
    const overtimeMinutes =
      shift ? Math.max(workMinutes - shift.overtimeThresholdMinutes, 0) : 0;

    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: employee.id,
          attendanceDate: new Date(parsed.attendanceDate),
        },
      },
      update: {
        shiftId: parsed.shiftId,
        checkInAt,
        checkOutAt,
        workMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        isHalfDay: shift ? workMinutes < shift.fullDayMinutes && workMinutes >= shift.halfDayMinutes : false,
        remarks: parsed.remarks,
        source: parsed.source,
      },
      create: {
        tenantId: session.tenant.id,
        employeeId: employee.id,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        shiftId: parsed.shiftId,
        attendanceDate: new Date(parsed.attendanceDate),
        checkInAt,
        checkOutAt,
        workMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        isHalfDay: shift ? workMinutes < shift.fullDayMinutes && workMinutes >= shift.halfDayMinutes : false,
        remarks: parsed.remarks,
        source: parsed.source,
        createdById: session.user.id,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "attendance"));
    redirectWithMessage(redirectTo, "success", "Attendance saved successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to save attendance."));
  }
}

export async function checkInAction() {
  const session = await getAuthenticatedSession();

  if (!session?.tenant) {
    redirectWithMessage("/auth/login", "error", "Please sign in again.");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: session.tenant.id,
      userAccountId: session.user.id,
    },
  });

  if (!employee) {
    redirectWithMessage(buildRedirect(session.tenant.slug, "self-service"), "error", "Employee profile not linked.");
  }

  const now = new Date();

  await prisma.attendanceRecord.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate: new Date(format(now, "yyyy-MM-dd")),
      },
    },
    update: {
      checkInAt: now,
      source: "SELF_SERVICE",
    },
    create: {
      tenantId: session.tenant.id,
      employeeId: employee.id,
      branchId: employee.branchId,
      departmentId: employee.departmentId,
      attendanceDate: new Date(format(now, "yyyy-MM-dd")),
      checkInAt: now,
      source: "SELF_SERVICE",
    },
  });

  revalidatePath(buildRedirect(session.tenant.slug, "self-service"));
  redirectWithMessage(buildRedirect(session.tenant.slug, "self-service"), "success", "Check-in recorded.");
}

export async function checkOutAction() {
  const session = await getAuthenticatedSession();

  if (!session?.tenant) {
    redirectWithMessage("/auth/login", "error", "Please sign in again.");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: session.tenant.id,
      userAccountId: session.user.id,
    },
  });

  if (!employee) {
    redirectWithMessage(buildRedirect(session.tenant.slug, "self-service"), "error", "Employee profile not linked.");
  }

  const now = new Date();
  const attendanceDate = new Date(format(now, "yyyy-MM-dd"));
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee.id,
        attendanceDate,
      },
    },
  });

  if (!existing?.checkInAt) {
    redirectWithMessage(buildRedirect(session.tenant.slug, "self-service"), "error", "Check-in missing for today.");
  }

  await prisma.attendanceRecord.update({
    where: {
      id: existing.id,
    },
    data: {
      checkOutAt: now,
      workMinutes: Math.max(differenceInMinutes(now, existing.checkInAt), 0),
      source: "SELF_SERVICE",
    },
  });

  revalidatePath(buildRedirect(session.tenant.slug, "self-service"));
  redirectWithMessage(buildRedirect(session.tenant.slug, "self-service"), "success", "Check-out recorded.");
}

export async function createAttendanceRequestAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "attendance"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ATTENDANCE", "add");
    const parsed = createAttendanceRequestSchema.parse(rawData);
    const attachment = formData.get("attachment");
    let attachmentUrl: string | null = null;

    if (attachment instanceof File && attachment.size > 0) {
      const uploaded = await saveUploadedFile(attachment, [session.tenant.id, "attendance-request"], {
        kind: "document",
      });
      attachmentUrl = uploaded?.fileUrl ?? null;
    }

    const request = await prisma.attendanceRequest.create({
      data: {
        tenantId: session.tenant.id,
        employeeId: parsed.employeeId,
        attendanceRecordId: parsed.attendanceRecordId,
        type: parsed.type,
        requestedDate: new Date(parsed.requestedDate),
        requestedCheckInAt: parsed.requestedCheckInAt ? new Date(parsed.requestedCheckInAt) : null,
        requestedCheckOutAt: parsed.requestedCheckOutAt ? new Date(parsed.requestedCheckOutAt) : null,
        reason: parsed.reason,
        attachmentUrl,
      },
    });

    await createApprovalTaskIfWorkflowExists({
      tenantId: session.tenant.id,
      moduleKey: "ATTENDANCE",
      entityType: "AttendanceRequest",
      entityId: request.id,
      title: `Attendance ${parsed.type.replaceAll("_", " ")}`,
      requestedById: session.user.id,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "ATTENDANCE",
      action: "REQUEST",
      entityType: "AttendanceRequest",
      entityId: request.id,
      summary: `Submitted ${parsed.type.replaceAll("_", " ").toLowerCase()} attendance request.`,
      payload: {
        employeeId: parsed.employeeId,
        requestedDate: parsed.requestedDate,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "attendance"));
    revalidatePath(buildRedirect(tenantSlug, "approvals"));

    redirectWithMessage(redirectTo, "success", "Attendance request submitted.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to submit the attendance request."));
  }
}

export async function updateAttendanceRequestStatusAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "approvals"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "APPROVALS", "approve", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.BRANCH_MANAGER,
      Role.DEPARTMENT_HEAD,
    ]);
    const parsed = updateRequestStatusSchema.parse(rawData);

    const request = await prisma.attendanceRequest.update({
      where: {
        id: parsed.id,
      },
      data: {
        status: parsed.status,
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        reviewComment: parsed.reviewComment,
      },
    });

    await prisma.approvalTask.updateMany({
      where: {
        tenantId: session.tenant.id,
        entityType: "AttendanceRequest",
        entityId: request.id,
      },
      data: {
        status: parsed.status,
        approvedById: session.user.id,
        comments: parsed.reviewComment,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "ATTENDANCE",
      action: "REVIEW",
      entityType: "AttendanceRequest",
      entityId: request.id,
      summary: `Marked attendance request as ${parsed.status.toLowerCase()}.`,
      payload: {
        reviewComment: parsed.reviewComment,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "attendance"));
    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", `Attendance request ${parsed.status.toLowerCase()}.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to update the attendance request."));
  }
}

function sumJsonAmount(values: Array<{ amount?: number | string }> | undefined) {
  return (values ?? []).reduce((total, item) => total + Number(item.amount ?? 0), 0);
}

export async function createLeaveTypeAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "leave"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "LEAVE", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);
    const parsed = createLeaveTypeSchema.parse(rawData);

    await prisma.leaveType.create({
      data: {
        tenantId: session.tenant.id,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
        annualQuota: parsed.annualQuota,
        allowCarryForward: isTruthyFormValue(parsed.allowCarryForward),
        allowHalfDay: isTruthyFormValue(parsed.allowHalfDay),
        allowShortLeave: isTruthyFormValue(parsed.allowShortLeave),
        isPaid: isTruthyFormValue(parsed.isPaid),
        requiresApproval: isTruthyFormValue(parsed.requiresApproval),
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "leave"));
    redirectWithMessage(redirectTo, "success", "Leave type created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the leave type."));
  }
}

export async function createLeaveRequestAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "leave"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "LEAVE", "add");
    const parsed = createLeaveRequestSchema.parse(rawData);
    const attachment = formData.get("attachment");
    let attachmentUrl: string | null = null;

    if (attachment instanceof File && attachment.size > 0) {
      const uploaded = await saveUploadedFile(attachment, [session.tenant.id, "leave-request"], {
        kind: "document",
      });
      attachmentUrl = uploaded?.fileUrl ?? null;
    }

    const request = await prisma.leaveRequest.create({
      data: {
        tenantId: session.tenant.id,
        employeeId: parsed.employeeId,
        leaveTypeId: parsed.leaveTypeId,
        durationType: parsed.durationType,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        totalDays: parsed.totalDays,
        reason: parsed.reason,
        attachmentUrl,
      },
    });

    await createApprovalTaskIfWorkflowExists({
      tenantId: session.tenant.id,
      moduleKey: "LEAVE",
      entityType: "LeaveRequest",
      entityId: request.id,
      title: `Leave request from ${format(new Date(parsed.startDate), "dd MMM yyyy")}`,
      requestedById: session.user.id,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "LEAVE",
      action: "REQUEST",
      entityType: "LeaveRequest",
      entityId: request.id,
      summary: `Submitted leave request from ${format(new Date(parsed.startDate), "dd MMM yyyy")}.`,
      payload: {
        employeeId: parsed.employeeId,
        leaveTypeId: parsed.leaveTypeId,
        totalDays: parsed.totalDays,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "leave"));
    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", "Leave request submitted.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to submit the leave request."));
  }
}

export async function updateLeaveRequestStatusAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "approvals"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "APPROVALS", "approve");
    const parsed = updateRequestStatusSchema.parse(rawData);

    const request = await prisma.leaveRequest.update({
      where: {
        id: parsed.id,
      },
      data: {
        status: parsed.status,
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        reviewComment: parsed.reviewComment,
      },
    });

    await prisma.approvalTask.updateMany({
      where: {
        tenantId: session.tenant.id,
        entityType: "LeaveRequest",
        entityId: request.id,
      },
      data: {
        status: parsed.status,
        approvedById: session.user.id,
        comments: parsed.reviewComment,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "LEAVE",
      action: "REVIEW",
      entityType: "LeaveRequest",
      entityId: request.id,
      summary: `Marked leave request as ${parsed.status.toLowerCase()}.`,
      payload: {
        reviewComment: parsed.reviewComment,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "leave"));
    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", `Leave request ${parsed.status.toLowerCase()}.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to update the leave request."));
  }
}

export async function createHolidayAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "holidays"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "HOLIDAYS", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);
    const parsed = createHolidaySchema.parse(rawData);

    await prisma.holiday.create({
      data: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId,
        name: parsed.name,
        holidayDate: new Date(parsed.holidayDate),
        scope: parsed.scope,
        description: parsed.description,
        isOptional: isTruthyFormValue(parsed.isOptional),
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "holidays"));
    redirectWithMessage(redirectTo, "success", "Holiday created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the holiday."));
  }
}

export async function createSalaryStructureAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "payroll"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "PAYROLL", "add", [
      Role.TENANT_ADMIN,
      Role.PAYROLL_MANAGER,
      Role.ACCOUNTS_MANAGER,
    ]);
    const parsed = createSalaryStructureSchema.parse(rawData);

    await prisma.salaryStructure.create({
      data: {
        tenantId: session.tenant.id,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        baseSalary: parsed.baseSalary,
        allowances: JSON.parse(parsed.allowances),
        deductions: JSON.parse(parsed.deductions),
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "payroll"));
    redirectWithMessage(redirectTo, "success", "Salary structure created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the salary structure."));
  }
}

export async function createPayrollRunAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "payroll"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "PAYROLL", "add", [
      Role.TENANT_ADMIN,
      Role.PAYROLL_MANAGER,
      Role.ACCOUNTS_MANAGER,
    ]);
    const parsed = createPayrollRunSchema.parse(rawData);
    const periodStart = new Date(parsed.year, parsed.month - 1, 1);
    const periodEnd = new Date(parsed.year, parsed.month, 0, 23, 59, 59);
    const existingRun = await prisma.payrollRun.findFirst({
      where: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId ?? null,
        month: parsed.month,
        year: parsed.year,
      },
      select: {
        id: true,
      },
    });

    if (existingRun) {
      redirectWithMessage(
        redirectTo,
        "error",
        `A payroll run already exists for ${format(periodStart, "MMM yyyy")}${parsed.branchId ? " for the selected branch" : ""}.`,
      );
    }

    const employees = await prisma.employee.findMany({
      where: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId || undefined,
        status: {
          in: ["ACTIVE", "PROBATION", "ON_NOTICE"],
        },
      },
      include: {
        salaryStructure: true,
      },
    });

    if (employees.length === 0) {
      redirectWithMessage(
        redirectTo,
        "error",
        "No active employees matched the selected branch and payroll criteria.",
      );
    }

    const employeeIds = employees.map((employee) => employee.id);
    const [attendanceSummaries, loanDeductionSummaries] = await Promise.all([
      prisma.attendanceRecord.groupBy({
        by: ["employeeId"],
        where: {
          tenantId: session.tenant.id,
          employeeId: {
            in: employeeIds,
          },
          attendanceDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          overtimeMinutes: true,
        },
      }),
      prisma.loanAdvance.groupBy({
        by: ["employeeId"],
        where: {
          tenantId: session.tenant.id,
          employeeId: {
            in: employeeIds,
          },
          status: "ACTIVE",
        },
        _sum: {
          monthlyDeduction: true,
        },
      }),
    ]);

    const attendanceSummaryByEmployee = new Map(
      attendanceSummaries.map((summary) => [
        summary.employeeId,
        {
          attendanceDays: summary._count._all,
          overtimeMinutes: summary._sum.overtimeMinutes ?? 0,
        },
      ]),
    );
    const loanDeductionByEmployee = new Map(
      loanDeductionSummaries.map((summary) => [
        summary.employeeId,
        Number(summary._sum.monthlyDeduction ?? 0),
      ]),
    );

    let totalGross = 0;
    let totalNet = 0;
    const payrollItems = employees.map((employee) => {
      const attendanceSummary = attendanceSummaryByEmployee.get(employee.id);
      const attendanceDays = attendanceSummary?.attendanceDays ?? 0;
      const overtimeMinutes = attendanceSummary?.overtimeMinutes ?? 0;
      const baseSalary = Number(employee.salaryStructure?.baseSalary ?? employee.salary ?? 0);
      const allowances = (employee.salaryStructure?.allowances as Array<{ name: string; amount: number }> | null) ?? [];
      const deductions = (employee.salaryStructure?.deductions as Array<{ name: string; amount: number }> | null) ?? [];
      const bonus = employee.bonusEligible ? 1000 : 0;
      const incentive = overtimeMinutes > 0 ? Math.round(overtimeMinutes / 60) * 100 : 0;
      const loanDeduction = loanDeductionByEmployee.get(employee.id) ?? 0;
      const gross = baseSalary + sumJsonAmount(allowances) + bonus + incentive;
      const totalDeductions = sumJsonAmount(deductions) + loanDeduction;
      const netPay = gross - totalDeductions;

      totalGross += gross;
      totalNet += netPay;

      return {
        tenantId: session.tenant.id,
        employeeId: employee.id,
        salaryStructureId: employee.salaryStructureId,
        attendanceDays,
        overtimeMinutes,
        baseSalary,
        allowances,
        deductions,
        bonus,
        incentive,
        loanDeduction,
        advanceDeduction: 0,
        netPay,
        bankAccountName: employee.bankAccountName,
        bankAccountNumber: employee.bankAccountNumber,
        ifscCode: employee.bankIfscCode,
        payslipNumber: `PS-${parsed.year}${String(parsed.month).padStart(2, "0")}-${employee.employeeCode}`,
      };
    });

    const payrollRun = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.payrollRun.create({
        data: {
          tenantId: session.tenant.id,
          branchId: parsed.branchId,
          month: parsed.month,
          year: parsed.year,
          status: parsed.status ?? "DRAFT",
          notes: parsed.notes,
        },
      });

      await tx.payrollItem.createMany({
        data: payrollItems.map((item) => ({
          ...item,
          payrollRunId: createdRun.id,
        })),
      });

      await tx.payrollRun.update({
        where: {
          id: createdRun.id,
        },
        data: {
          totalEmployees: employees.length,
          totalGross,
          totalNet,
        },
      });

      return createdRun;
    });

    await createApprovalTaskIfWorkflowExists({
      tenantId: session.tenant.id,
      moduleKey: "PAYROLL",
      entityType: "PayrollRun",
      entityId: payrollRun.id,
      title: `Payroll ${parsed.month}/${parsed.year}`,
      requestedById: session.user.id,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "PAYROLL",
      action: "CREATE",
      entityType: "PayrollRun",
      entityId: payrollRun.id,
      summary: `Generated payroll run for ${format(periodStart, "MMM yyyy")}.`,
      payload: {
        branchId: parsed.branchId,
        totalEmployees: employees.length,
        totalGross,
        totalNet,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "payroll"));
    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", "Payroll run generated successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to generate payroll."));
  }
}

async function createAndSendNotification(input: {
  tenantId: string;
  userId?: string | null;
  employeeId?: string | null;
  type:
    | "SYSTEM"
    | "RENEWAL"
    | "LEAVE"
    | "PAYROLL"
    | "ATTENDANCE"
    | "NOTICE"
    | "SECURITY"
    | "APPROVAL";
  channel: "IN_APP" | "EMAIL" | "BOTH";
  title: string;
  message: string;
  link?: string | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      employeeId: input.employeeId ?? null,
      type: input.type,
      channel: input.channel,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      sentAt: input.channel === "EMAIL" || input.channel === "BOTH" ? new Date() : null,
    },
  });

  if ((input.channel === "EMAIL" || input.channel === "BOTH") && input.userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
    });

    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: input.title,
        text: input.message,
        html: `<p>${input.message}</p>`,
      });
    }
  }

  return notification;
}

export async function createAnnouncementAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "announcements"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ANNOUNCEMENTS", "add");
    const parsed = createAnnouncementSchema.parse(rawData);
    const attachment = formData.get("attachment");
    let attachmentUrl: string | null = null;

    if (attachment instanceof File && attachment.size > 0) {
      const uploaded = await saveUploadedFile(attachment, [session.tenant.id, "announcements"], {
        kind: "document",
      });
      attachmentUrl = uploaded?.fileUrl ?? null;
    }

    const announcement = await prisma.announcement.create({
      data: {
        tenantId: session.tenant.id,
        createdById: session.user.id,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        targetEmployeeId: parsed.targetEmployeeId,
        title: parsed.title,
        content: parsed.content,
        scope: parsed.scope,
        priority: parsed.priority,
        attachmentUrl,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "ANNOUNCEMENTS",
      action: "CREATE",
      entityType: "Announcement",
      entityId: announcement.id,
      summary: `Published announcement ${announcement.title}.`,
      payload: {
        scope: parsed.scope,
        priority: parsed.priority,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "announcements"));
    redirectWithMessage(redirectTo, "success", "Announcement published successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to publish the announcement."));
  }
}

export async function markAnnouncementReadAction(formData: FormData) {
  const session = await getAuthenticatedSession();

  if (!session?.tenant) {
    redirectWithMessage("/auth/login", "error", "Please sign in again.");
  }

  const rawData = parseFormData(formData);
  const announcementId = typeof rawData.announcementId === "string" ? rawData.announcementId : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(session.tenant.slug, "self-service"));

  if (!announcementId) {
    redirectWithMessage(redirectTo, "error", "Announcement is required.");
  }

  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId: session.user.id,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      tenantId: session.tenant.id,
      announcementId,
      userId: session.user.id,
    },
  });

  revalidatePath(redirectTo);
  redirectWithMessage(redirectTo, "success", "Announcement marked as read.");
}

export async function createApprovalWorkflowAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "approvals"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "APPROVALS", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
    ]);
    const parsed = createApprovalWorkflowSchema.parse(rawData);

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        tenantId: session.tenant.id,
        moduleKey: parsed.moduleKey,
        name: parsed.name,
        steps: {
          create: [
            {
              level: 1,
              role: parsed.stepOneRole,
              name: "Level 1",
            },
            ...(parsed.stepTwoRole
              ? [
                  {
                    level: 2,
                    role: parsed.stepTwoRole as Role,
                    name: "Level 2",
                  },
                ]
              : []),
          ],
        },
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "APPROVALS",
      action: "CREATE",
      entityType: "ApprovalWorkflow",
      entityId: workflow.id,
      summary: `Configured approval workflow for ${parsed.moduleKey.replaceAll("_", " ")}.`,
    });

    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", "Approval workflow saved successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to save approval workflow."));
  }
}

export async function updateApprovalTaskStatusAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "approvals"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "APPROVALS", "approve");
    const taskId = typeof rawData.taskId === "string" ? rawData.taskId : "";
    const status = typeof rawData.status === "string" ? rawData.status : "";
    const comments = typeof rawData.comments === "string" ? rawData.comments : "";

    if (!taskId || !["APPROVED", "REJECTED", "CANCELED"].includes(status)) {
      redirectWithMessage(redirectTo, "error", "Invalid approval action.");
    }

    const task = await prisma.approvalTask.update({
      where: {
        id: taskId,
      },
      data: {
        status: status as "APPROVED" | "REJECTED" | "CANCELED",
        approvedById: session.user.id,
        comments,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "APPROVALS",
      action: status,
      entityType: "ApprovalTask",
      entityId: task.id,
      summary: `Approval task ${status.toLowerCase()}.`,
      payload: {
        moduleKey: task.moduleKey,
        comments,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "approvals"));
    redirectWithMessage(redirectTo, "success", "Approval task updated successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to update the approval task."));
  }
}

export async function createNotificationAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "notifications"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "NOTIFICATIONS", "add");
    const parsed = createNotificationSchema.parse(rawData);

    const notification = await createAndSendNotification({
      tenantId: session.tenant.id,
      userId: parsed.userId,
      employeeId: parsed.employeeId,
      type: parsed.type,
      channel: parsed.channel,
      title: parsed.title,
      message: parsed.message,
      link: parsed.link,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "NOTIFICATIONS",
      action: "CREATE",
      entityType: "Notification",
      entityId: notification.id,
      summary: `Created ${parsed.type.toLowerCase()} notification ${notification.title}.`,
      payload: {
        channel: parsed.channel,
        userId: parsed.userId,
        employeeId: parsed.employeeId,
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "notifications"));
    redirectWithMessage(redirectTo, "success", "Notification created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the notification."));
  }
}

export async function markNotificationReadAction(formData: FormData) {
  const session = await getAuthenticatedSession();

  if (!session?.tenant) {
    redirectWithMessage("/auth/login", "error", "Please sign in again.");
  }

  const rawData = parseFormData(formData);
  const notificationId = typeof rawData.notificationId === "string" ? rawData.notificationId : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(session.tenant.slug, "self-service"));

  if (!notificationId) {
    redirectWithMessage(redirectTo, "error", "Notification is required.");
  }

  await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath(redirectTo);
  redirectWithMessage(redirectTo, "success", "Notification marked as read.");
}

export async function saveTenantModuleSettingsAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildRedirect(tenantSlug, "settings"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "SETTINGS", "edit", [
      Role.TENANT_ADMIN,
    ]);
    const parsed = updateTenantSettingsSchema.parse(rawData);

    await prisma.tenantSetting.upsert({
      where: {
        tenantId: session.tenant.id,
      },
      update: {
        companySettings: parsed.companySettings ? JSON.parse(parsed.companySettings) : {},
        attendanceSettings: parsed.attendanceSettings ? JSON.parse(parsed.attendanceSettings) : {},
        leaveSettings: parsed.leaveSettings ? JSON.parse(parsed.leaveSettings) : {},
        payrollSettings: parsed.payrollSettings ? JSON.parse(parsed.payrollSettings) : {},
        smtpSettings: parsed.smtpSettings ? JSON.parse(parsed.smtpSettings) : {},
        idGenerationRules: parsed.idGenerationRules ? JSON.parse(parsed.idGenerationRules) : {},
      },
      create: {
        tenantId: session.tenant.id,
        companySettings: parsed.companySettings ? JSON.parse(parsed.companySettings) : {},
        attendanceSettings: parsed.attendanceSettings ? JSON.parse(parsed.attendanceSettings) : {},
        leaveSettings: parsed.leaveSettings ? JSON.parse(parsed.leaveSettings) : {},
        payrollSettings: parsed.payrollSettings ? JSON.parse(parsed.payrollSettings) : {},
        smtpSettings: parsed.smtpSettings ? JSON.parse(parsed.smtpSettings) : {},
        idGenerationRules: parsed.idGenerationRules ? JSON.parse(parsed.idGenerationRules) : {},
      },
    });

    revalidatePath(buildRedirect(tenantSlug, "settings"));
    redirectWithMessage(redirectTo, "success", "Tenant settings saved successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to save tenant settings."));
  }
}
