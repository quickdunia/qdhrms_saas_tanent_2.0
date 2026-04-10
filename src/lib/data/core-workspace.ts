import { addDays, startOfMonth } from "date-fns";
import { Role } from "@prisma/client";

import type { PhaseTwoWorkspace } from "@/lib/data/phase-two";
import type { CoreModuleDefinition } from "@/lib/modules/registry";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "brand";

export type CoreReferenceData = {
  approvalTasks: Array<{ id: string; label: string }>;
  branches: Array<{ id: string; name: string }>;
  currentEmployee: null | { id: string; label: string };
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; label: string }>;
  leaveTypes: Array<{ id: string; label: string }>;
  salaryStructures: Array<{ id: string; label: string }>;
  shifts: Array<{ id: string; label: string }>;
  users: Array<{ id: string; label: string }>;
};

export type CoreWorkspace = PhaseTwoWorkspace;

function resolveBadgeVariant(status: string): BadgeVariant {
  if (["ACTIVE", "OPEN", "COMPLETED", "APPROVED", "PAID", "READ"].includes(status)) {
    return "success";
  }

  if (["PENDING", "DRAFT", "TRIALING", "IN_PROGRESS", "UNREAD"].includes(status)) {
    return "warning";
  }

  if (["FAILED", "SUSPENDED", "REJECTED", "CANCELED", "PARTIAL"].includes(status)) {
    return "danger";
  }

  return "brand";
}

export async function getCoreReferenceData(tenantId: string, userId?: string): Promise<CoreReferenceData> {
  const [approvalTasks, branches, currentEmployee, departments, employees, leaveTypes, salaryStructures, shifts, users] =
    await Promise.all([
      prisma.approvalTask.findMany({
        where: { tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 150,
        select: { id: true, title: true },
      }),
      prisma.branch.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      userId
        ? prisma.employee.findFirst({
            where: { tenantId, userAccountId: userId },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          })
        : Promise.resolve(null),
      prisma.department.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.employee.findMany({
        where: { tenantId },
        orderBy: { firstName: "asc" },
        take: 300,
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      }),
      prisma.leaveType.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.salaryStructure.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.shift.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.user.findMany({
        where: { tenantId },
        orderBy: { firstName: "asc" },
        take: 300,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

  return {
    approvalTasks: approvalTasks.map((task) => ({ id: task.id, label: task.title })),
    branches,
    currentEmployee: currentEmployee
      ? {
          id: currentEmployee.id,
          label: `${[currentEmployee.firstName, currentEmployee.lastName].filter(Boolean).join(" ")} (${currentEmployee.employeeCode})`,
        }
      : null,
    departments,
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${[employee.firstName, employee.lastName].filter(Boolean).join(" ")} (${employee.employeeCode})`,
    })),
    leaveTypes: leaveTypes.map((leaveType) => ({
      id: leaveType.id,
      label: `${leaveType.name} (${leaveType.code})`,
    })),
    salaryStructures: salaryStructures.map((structure) => ({
      id: structure.id,
      label: `${structure.name} (${structure.code})`,
    })),
    shifts: shifts.map((shift) => ({ id: shift.id, label: `${shift.name} (${shift.code})` })),
    users: users.map((user) => ({
      id: user.id,
      label: `${[user.firstName, user.lastName].filter(Boolean).join(" ")} - ${user.email}`,
    })),
  };
}

export async function getCoreModuleWorkspace(input: {
  module: CoreModuleDefinition;
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userRole: Role;
  search?: string;
  status?: string;
  page?: string;
  pageSize?: number;
}): Promise<CoreWorkspace> {
  const { page, take, skip } = getPaginationParams(input.page, input.pageSize ?? 8);
  const search = input.search?.trim();
  const status = input.status?.trim().toUpperCase();

  switch (input.module.key) {
    case "SELF_SERVICE":
      return getSelfServiceWorkspace(input.tenantId, input.userId, { search, status, page, take, skip });
    case "USERS":
      return getUsersWorkspace(input.tenantId, { search, status, page, take, skip });
    case "ROLES":
      return getRolesWorkspace(input.tenantId, { search, status, page, take, skip });
    case "ATTENDANCE":
      return getAttendanceWorkspace(input.tenantId, { search, status, page, take, skip });
    case "LEAVE":
      return getLeaveWorkspace(input.tenantId, { search, status, page, take, skip });
    case "PAYROLL":
      return getPayrollWorkspace(input.tenantId, input.tenantSlug, { search, status, page, take, skip });
    case "ANNOUNCEMENTS":
      return getAnnouncementsWorkspace(input.tenantId, { search, status, page, take, skip });
    case "APPROVALS":
      return getApprovalsWorkspace(input.tenantId, { search, status, page, take, skip });
    case "NOTIFICATIONS":
      return getNotificationsWorkspace(input.tenantId, { search, status, page, take, skip });
    case "IMPORT_EXPORT":
      return getImportsWorkspace(input.tenantId, { search, status, page, take, skip });
    default:
      return getUsersWorkspace(input.tenantId, { search, status, page, take, skip });
  }
}

async function getSelfServiceWorkspace(
  tenantId: string,
  userId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const employee = await prisma.employee.findFirst({
    where: { tenantId, userAccountId: userId },
    include: { branch: true, department: true },
  });

  if (!employee) {
    return {
      metrics: [
        { label: "Profile", value: "Missing", description: "Your employee profile is not linked yet." },
        { label: "Check-in", value: "-", description: "Attendance actions unlock after profile mapping." },
        { label: "Leave requests", value: 0, description: "Open requests linked to your employee profile." },
        { label: "Notifications", value: 0, description: "Unread updates appear here when your profile is active." },
      ],
      insights: [
        { title: "Profile action", value: "Required", detail: "Ask HR to link your employee record to your portal account." },
        { title: "Next step", value: "Contact HR", detail: "Once linked, attendance, leave, and self-service tools will appear automatically." },
      ],
      rows: [],
      exportRows: [],
      statusOptions: [],
      page: 1,
      totalPages: 1,
      searchPlaceholder: "Search your notices and recent activity",
      emptyTitle: "Employee profile not linked",
      emptyDescription: "Ask your HR or tenant administrator to connect your employee profile for self-service access.",
    };
  }

  const today = new Date();
  const todayStart = new Date(today.toISOString().slice(0, 10));

  const baseNotifications = {
    tenantId,
    OR: [{ userId }, { employeeId: employee.id }],
  };

  const notificationWhere = {
    ...baseNotifications,
    ...(pager.status === "READ"
      ? { isRead: true }
      : pager.status === "UNREAD"
        ? { isRead: false }
        : {}),
    ...(pager.search
      ? {
          AND: [
            {
              OR: [
                { title: { contains: pager.search } },
                { message: { contains: pager.search } },
              ],
            },
          ],
        }
      : {}),
  };

  const [todayAttendance, openLeaveRequests, unreadNotifications, assignedAssets, totalRows, notifications] =
    await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: employee.id,
            attendanceDate: todayStart,
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          tenantId,
          employeeId: employee.id,
          status: { in: ["PENDING", "APPROVED"] },
        },
      }),
      prisma.notification.count({
        where: { ...baseNotifications, isRead: false },
      }),
      prisma.assetAssignment.count({
        where: { tenantId, employeeId: employee.id, status: "ISSUED" },
      }),
      prisma.notification.count({ where: notificationWhere }),
      prisma.notification.findMany({
        where: notificationWhere,
        orderBy: { createdAt: "desc" },
        take: pager.take,
        skip: pager.skip,
      }),
    ]);

  return {
    metrics: [
      {
        label: "Today's status",
        value: todayAttendance?.checkInAt ? "Checked in" : "Awaiting check-in",
        description: "Your attendance status for the current day.",
      },
      {
        label: "Open leave",
        value: openLeaveRequests,
        description: "Leave requests currently pending or approved.",
      },
      {
        label: "Unread updates",
        value: unreadNotifications,
        description: "Notifications that still need your attention.",
      },
      {
        label: "Assigned assets",
        value: assignedAssets,
        description: "Assets currently issued to your employee record.",
      },
    ],
    insights: [
      {
        title: "Profile",
        value: `${employee.employeeCode}`,
        detail: `${employee.branch.name} • ${employee.department.name}`,
      },
      {
        title: "Check-in time",
        value: todayAttendance?.checkInAt ? formatDateTime(todayAttendance.checkInAt, "hh:mm a") : "-",
        detail: todayAttendance?.checkOutAt
          ? `Checked out at ${formatDateTime(todayAttendance.checkOutAt, "hh:mm a")}`
          : "No check-out recorded yet.",
      },
    ],
    rows: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      subtitle: notification.type.replaceAll("_", " "),
      badge: {
        label: notification.isRead ? "Read" : "Unread",
        variant: notification.isRead ? "success" : "warning",
      },
      fields: [
        { label: "Channel", value: notification.channel.replaceAll("_", " ") },
        { label: "Message", value: notification.message },
        { label: "Created", value: formatDateTime(notification.createdAt) },
      ],
    })),
    exportRows: notifications.map((notification) => ({
      Title: notification.title,
      Type: notification.type.replaceAll("_", " "),
      Channel: notification.channel.replaceAll("_", " "),
      Status: notification.isRead ? "Read" : "Unread",
      Message: notification.message,
      CreatedAt: formatDateTime(notification.createdAt),
    })),
    statusOptions: ["UNREAD", "READ"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search your notifications or updates",
    emptyTitle: "No self-service updates yet",
    emptyDescription: "Notices, workflow updates, and personal notifications will appear here as activity happens.",
  };
}

async function getUsersWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search
      ? {
          OR: [
            { firstName: { contains: pager.search } },
            { lastName: { contains: pager.search } },
            { email: { contains: pager.search } },
          ],
        }
      : {}),
  };

  const [totalUsers, pendingUsers, activeUsers, suspendedUsers, totalRows, users] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, status: "PENDING" } }),
    prisma.user.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.user.count({ where: { tenantId, status: { in: ["SUSPENDED", "LOCKED"] } } }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Total users", value: totalUsers, description: "Accounts provisioned for this tenant workspace." },
      { label: "Pending setup", value: pendingUsers, description: "Users still waiting to complete OTP password setup." },
      { label: "Active", value: activeUsers, description: "Users who can currently access the portal." },
      { label: "Suspended", value: suspendedUsers, description: "Blocked or locked user accounts." },
    ],
    insights: [
      { title: "Pending activation", value: `${pendingUsers}`, detail: "OTP onboarding is still open for these users." },
      { title: "Access health", value: `${activeUsers}`, detail: "Users currently available for operational work." },
    ],
    rows: users.map((user) => ({
      id: user.id,
      title: [user.firstName, user.lastName].filter(Boolean).join(" "),
      subtitle: user.email,
      badge: { label: user.status.replaceAll("_", " "), variant: resolveBadgeVariant(user.status) },
      fields: [
        { label: "Role", value: user.role.replaceAll("_", " ") },
        { label: "Phone", value: user.phone ?? "-" },
        { label: "Last login", value: formatDateTime(user.lastLoginAt) },
        { label: "Created", value: formatDateTime(user.createdAt) },
      ],
    })),
    exportRows: users.map((user) => ({
      Name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      Email: user.email,
      Role: user.role.replaceAll("_", " "),
      Status: user.status.replaceAll("_", " "),
      LastLoginAt: formatDateTime(user.lastLoginAt),
      CreatedAt: formatDateTime(user.createdAt),
    })),
    statusOptions: ["PENDING", "ACTIVE", "HOLD", "SUSPENDED", "LOCKED", "DELETED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search users by name or email",
    emptyTitle: "No tenant users yet",
    emptyDescription: "Create the first tenant user to onboard managers, HR staff, and operational users.",
  };
}

async function getRolesWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const matchedRole = Object.values(Role).find((role) => role.includes((pager.search ?? "").toUpperCase()));
  const where = {
    tenantId,
    ...(pager.status ? { role: pager.status as never } : {}),
    ...(pager.search
      ? {
          OR: [
            ...(matchedRole ? [{ role: matchedRole }] : []),
            { moduleKey: { contains: pager.search } },
          ],
        }
      : {}),
  };

  const [totalOverrides, approvalCapable, exportCapable, totalRows, permissions] = await Promise.all([
    prisma.rolePermission.count({ where: { tenantId } }),
    prisma.rolePermission.count({ where: { tenantId, canApprove: true } }),
    prisma.rolePermission.count({ where: { tenantId, canExport: true } }),
    prisma.rolePermission.count({ where }),
    prisma.rolePermission.findMany({
      where,
      orderBy: [{ role: "asc" }, { moduleKey: "asc" }],
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Permission rows", value: totalOverrides, description: "Tenant role permission rows currently stored." },
      { label: "Approvers", value: approvalCapable, description: "Role-module combinations that can approve actions." },
      { label: "Export enabled", value: exportCapable, description: "Role permissions with export access." },
      { label: "Roles", value: Object.keys(Role).length, description: "Available role profiles in the platform." },
    ],
    insights: [
      { title: "Approval surface", value: `${approvalCapable}`, detail: "Review approval-capable permissions regularly for least privilege." },
      { title: "Export surface", value: `${exportCapable}`, detail: "Export access can expose sensitive operational data." },
    ],
    rows: permissions.map((permission) => ({
      id: permission.id,
      title: permission.role.replaceAll("_", " "),
      subtitle: permission.moduleKey.replaceAll("_", " "),
      badge: { label: permission.canView ? "View enabled" : "Hidden", variant: permission.canView ? "success" : "danger" },
      fields: [
        { label: "Add/Edit", value: `${permission.canAdd ? "Add" : "-"} / ${permission.canEdit ? "Edit" : "-"}` },
        { label: "Delete", value: permission.canDelete ? "Allowed" : "Blocked" },
        { label: "Approve", value: permission.canApprove ? "Allowed" : "Blocked" },
        { label: "Export", value: permission.canExport ? "Allowed" : "Blocked" },
      ],
    })),
    exportRows: permissions.map((permission) => ({
      Role: permission.role.replaceAll("_", " "),
      Module: permission.moduleKey.replaceAll("_", " "),
      CanView: permission.canView ? "Yes" : "No",
      CanAdd: permission.canAdd ? "Yes" : "No",
      CanEdit: permission.canEdit ? "Yes" : "No",
      CanDelete: permission.canDelete ? "Yes" : "No",
      CanApprove: permission.canApprove ? "Yes" : "No",
      CanExport: permission.canExport ? "Yes" : "No",
    })),
    statusOptions: Object.values(Role),
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search role or module",
    emptyTitle: "No permission rows found",
    emptyDescription: "Seeded role permissions will appear here once the tenant workspace has been provisioned.",
  };
}

async function getAttendanceWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { source: pager.status as never } : {}),
    ...(pager.search
      ? {
          employee: {
            OR: [
              { firstName: { contains: pager.search } },
              { lastName: { contains: pager.search } },
              { employeeCode: { contains: pager.search } },
            ],
          },
        }
      : {}),
  };

  const todayStart = new Date(new Date().toISOString().slice(0, 10));

  const [presentToday, openCheckout, correctionRequests, activeShifts, totalRows, records] =
    await Promise.all([
      prisma.attendanceRecord.count({ where: { tenantId, attendanceDate: todayStart } }),
      prisma.attendanceRecord.count({
        where: {
          tenantId,
          attendanceDate: todayStart,
          checkInAt: { not: null },
          checkOutAt: null,
        },
      }),
      prisma.attendanceRequest.count({ where: { tenantId, status: "PENDING" } }),
      prisma.shift.count({ where: { tenantId } }),
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          shift: { select: { name: true } },
        },
        orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
        take: pager.take,
        skip: pager.skip,
      }),
    ]);

  return {
    metrics: [
      { label: "Present today", value: presentToday, description: "Attendance records captured for the current day." },
      { label: "Open check-outs", value: openCheckout, description: "Employees who have checked in but not checked out yet." },
      { label: "Correction queue", value: correctionRequests, description: "Attendance requests waiting approval." },
      { label: "Active shifts", value: activeShifts, description: "Active shift templates available for assignment and capture." },
    ],
    insights: [
      { title: "Daily closure risk", value: `${openCheckout}`, detail: "Open check-outs can distort work-time and payroll calculations." },
      { title: "Corrections pending", value: `${correctionRequests}`, detail: "Requests waiting on managers or HR approvals." },
    ],
    rows: records.map((record) => ({
      id: record.id,
      title: `${[record.employee.firstName, record.employee.lastName].filter(Boolean).join(" ")} (${record.employee.employeeCode})`,
      subtitle: formatDate(record.attendanceDate),
      badge: { label: record.source.replaceAll("_", " "), variant: resolveBadgeVariant(record.source) },
      fields: [
        { label: "Shift", value: record.shift?.name ?? "General" },
        { label: "Check-in", value: formatDateTime(record.checkInAt, "hh:mm a") },
        { label: "Check-out", value: formatDateTime(record.checkOutAt, "hh:mm a") },
        { label: "Work minutes", value: `${record.workMinutes}` },
      ],
    })),
    exportRows: records.map((record) => ({
      Employee: `${[record.employee.firstName, record.employee.lastName].filter(Boolean).join(" ")} (${record.employee.employeeCode})`,
      AttendanceDate: formatDate(record.attendanceDate),
      Source: record.source.replaceAll("_", " "),
      Shift: record.shift?.name ?? "General",
      CheckIn: formatDateTime(record.checkInAt),
      CheckOut: formatDateTime(record.checkOutAt),
      WorkMinutes: record.workMinutes,
    })),
    statusOptions: ["SELF_SERVICE", "MANUAL", "IMPORT"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search employee name or code",
    emptyTitle: "No attendance records yet",
    emptyDescription: "Attendance, shift assignments, and correction requests will appear here once capture begins.",
  };
}

async function getLeaveWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search
      ? {
          employee: {
            OR: [
              { firstName: { contains: pager.search } },
              { lastName: { contains: pager.search } },
              { employeeCode: { contains: pager.search } },
            ],
          },
        }
      : {}),
  };

  const [leaveTypes, pendingRequests, approvedThisMonth, upcomingHolidays, totalRows, leaveRequests] =
    await Promise.all([
      prisma.leaveType.count({ where: { tenantId, isActive: true } }),
      prisma.leaveRequest.count({ where: { tenantId, status: "PENDING" } }),
      prisma.leaveRequest.count({
        where: {
          tenantId,
          status: "APPROVED",
          reviewedAt: { gte: startOfMonth(new Date()) },
        },
      }),
      prisma.holiday.count({
        where: {
          tenantId,
          holidayDate: { gte: new Date(), lte: addDays(new Date(), 30) },
        },
      }),
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          leaveType: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: pager.take,
        skip: pager.skip,
      }),
    ]);

  return {
    metrics: [
      { label: "Leave types", value: leaveTypes, description: "Configured leave policies available in the tenant." },
      { label: "Pending requests", value: pendingRequests, description: "Leave applications waiting review and approval." },
      { label: "Approved this month", value: approvedThisMonth, description: "Requests approved during the current month." },
      { label: "Upcoming holidays", value: upcomingHolidays, description: "Holidays falling within the next 30 days." },
    ],
    insights: [
      { title: "Approval load", value: `${pendingRequests}`, detail: "Requests still sitting in the queue." },
      { title: "Calendar view", value: `${upcomingHolidays}`, detail: "Upcoming holidays that affect workforce planning." },
    ],
    rows: leaveRequests.map((request) => ({
      id: request.id,
      title: `${[request.employee.firstName, request.employee.lastName].filter(Boolean).join(" ")} (${request.employee.employeeCode})`,
      subtitle: request.leaveType.name,
      badge: { label: request.status.replaceAll("_", " "), variant: resolveBadgeVariant(request.status) },
      fields: [
        { label: "Duration", value: request.durationType.replaceAll("_", " ") },
        { label: "Dates", value: `${formatDate(request.startDate)} to ${formatDate(request.endDate)}` },
        { label: "Days", value: `${Number(request.totalDays)}` },
        { label: "Requested", value: formatDateTime(request.createdAt) },
      ],
    })),
    exportRows: leaveRequests.map((request) => ({
      Employee: `${[request.employee.firstName, request.employee.lastName].filter(Boolean).join(" ")} (${request.employee.employeeCode})`,
      LeaveType: `${request.leaveType.name} (${request.leaveType.code})`,
      Status: request.status.replaceAll("_", " "),
      DurationType: request.durationType.replaceAll("_", " "),
      StartDate: formatDate(request.startDate),
      EndDate: formatDate(request.endDate),
      TotalDays: Number(request.totalDays),
    })),
    statusOptions: ["PENDING", "APPROVED", "REJECTED", "CANCELED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search employee name or code",
    emptyTitle: "No leave requests yet",
    emptyDescription: "Leave requests and holiday planning will appear here once employees start using the leave module.",
  };
}

async function getPayrollWorkspace(
  tenantId: string,
  tenantSlug: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { payrollRun: { status: pager.status as never } } : {}),
    ...(pager.search
      ? {
          OR: [
            { payslipNumber: { contains: pager.search } },
            {
              employee: {
                OR: [
                  { firstName: { contains: pager.search } },
                  { lastName: { contains: pager.search } },
                  { employeeCode: { contains: pager.search } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [structures, runs, processedRuns, totalNet, totalRows, payrollItems] = await Promise.all([
    prisma.salaryStructure.count({ where: { tenantId, isActive: true } }),
    prisma.payrollRun.count({ where: { tenantId } }),
    prisma.payrollRun.count({ where: { tenantId, status: { in: ["PROCESSED", "PAID"] } } }),
    prisma.payrollRun.aggregate({ where: { tenantId }, _sum: { totalNet: true } }),
    prisma.payrollItem.count({ where }),
    prisma.payrollItem.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        payrollRun: true,
      },
      orderBy: [
        { payrollRun: { year: "desc" } },
        { payrollRun: { month: "desc" } },
        { createdAt: "desc" },
      ],
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Salary structures", value: structures, description: "Salary templates currently available for payroll." },
      { label: "Payroll runs", value: runs, description: "Generated payroll runs across all periods." },
      { label: "Processed runs", value: processedRuns, description: "Runs already processed or marked paid." },
      {
        label: "Total net value",
        value: formatCurrency(Number(totalNet._sum.totalNet ?? 0)),
        description: "Net payroll value captured across payroll runs.",
      },
    ],
    insights: [
      { title: "Payroll maturity", value: `${processedRuns}`, detail: "Processed or paid runs with completed execution status." },
      { title: "Latest payout base", value: formatCurrency(Number(totalNet._sum.totalNet ?? 0)), detail: "Net payroll stored in payroll history." },
    ],
    rows: payrollItems.map((item) => ({
      id: item.id,
      title: `${[item.employee.firstName, item.employee.lastName].filter(Boolean).join(" ")} (${item.employee.employeeCode})`,
      subtitle: item.payslipNumber ?? `Payroll ${item.payrollRun.month}/${item.payrollRun.year}`,
      action: {
        label: "View payslip",
        href: `/t/${tenantSlug}/payroll/payslip?payrollItemId=${item.id}`,
      },
      badge: { label: item.payrollRun.status.replaceAll("_", " "), variant: resolveBadgeVariant(item.payrollRun.status) },
      fields: [
        { label: "Period", value: `${item.payrollRun.month}/${item.payrollRun.year}` },
        { label: "Base salary", value: formatCurrency(Number(item.baseSalary)) },
        { label: "Net pay", value: formatCurrency(Number(item.netPay)) },
        { label: "Created", value: formatDateTime(item.createdAt) },
      ],
    })),
    exportRows: payrollItems.map((item) => ({
      Employee: `${[item.employee.firstName, item.employee.lastName].filter(Boolean).join(" ")} (${item.employee.employeeCode})`,
      PayslipNumber: item.payslipNumber ?? "",
      PayrollStatus: item.payrollRun.status.replaceAll("_", " "),
      Period: `${item.payrollRun.month}/${item.payrollRun.year}`,
      BaseSalary: Number(item.baseSalary),
      Bonus: Number(item.bonus),
      Incentive: Number(item.incentive),
      LoanDeduction: Number(item.loanDeduction),
      NetPay: Number(item.netPay),
    })),
    statusOptions: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSED", "PAID"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search employee, code, or payslip number",
    emptyTitle: "No payroll items yet",
    emptyDescription: "Create salary structures and generate the first payroll run to unlock payslips and payroll exports.",
  };
}

async function getAnnouncementsWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { priority: pager.status as never } : {}),
    ...(pager.search
      ? {
          OR: [{ title: { contains: pager.search } }, { content: { contains: pager.search } }],
        }
      : {}),
  };

  const [total, critical, expiringSoon, publishedThisWeek, totalRows, announcements] = await Promise.all([
    prisma.announcement.count({ where: { tenantId } }),
    prisma.announcement.count({ where: { tenantId, priority: "CRITICAL" } }),
    prisma.announcement.count({
      where: { tenantId, expiresAt: { gte: new Date(), lte: addDays(new Date(), 14) } },
    }),
    prisma.announcement.count({ where: { tenantId, publishedAt: { gte: addDays(new Date(), -7) } } }),
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Total notices", value: total, description: "Announcements published inside this tenant workspace." },
      { label: "Critical", value: critical, description: "High-priority notices that require attention." },
      { label: "Expiring soon", value: expiringSoon, description: "Notices expiring in the next 14 days." },
      { label: "Published this week", value: publishedThisWeek, description: "Announcement volume in the last seven days." },
    ],
    insights: [
      { title: "Broadcast urgency", value: `${critical}`, detail: "Critical notices deserve quick acknowledgement and follow-up." },
      { title: "Fresh comms", value: `${publishedThisWeek}`, detail: "Recently published notices moving across the organization." },
    ],
    rows: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      subtitle: announcement.scope.replaceAll("_", " "),
      badge: { label: announcement.priority.replaceAll("_", " "), variant: resolveBadgeVariant(announcement.priority) },
      fields: [
        { label: "Published", value: formatDateTime(announcement.publishedAt) },
        { label: "Expires", value: formatDate(announcement.expiresAt) },
        { label: "Attachment", value: announcement.attachmentUrl ? "Attached" : "None" },
      ],
    })),
    exportRows: announcements.map((announcement) => ({
      Title: announcement.title,
      Scope: announcement.scope.replaceAll("_", " "),
      Priority: announcement.priority.replaceAll("_", " "),
      PublishedAt: formatDateTime(announcement.publishedAt),
      ExpiresAt: formatDate(announcement.expiresAt),
      Attachment: announcement.attachmentUrl ?? "",
    })),
    statusOptions: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search title or announcement content",
    emptyTitle: "No announcements yet",
    emptyDescription: "Published notices, circulars, and updates will appear here once internal communication starts.",
  };
}

async function getApprovalsWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search
      ? {
          OR: [
            { title: { contains: pager.search } },
            { moduleKey: { contains: pager.search } },
            { entityType: { contains: pager.search } },
          ],
        }
      : {}),
  };

  const [workflows, pending, approvedThisMonth, rejectedThisMonth, totalRows, tasks] = await Promise.all([
    prisma.approvalWorkflow.count({ where: { tenantId, isActive: true } }),
    prisma.approvalTask.count({ where: { tenantId, status: "PENDING" } }),
    prisma.approvalTask.count({
      where: { tenantId, status: "APPROVED", updatedAt: { gte: startOfMonth(new Date()) } },
    }),
    prisma.approvalTask.count({
      where: { tenantId, status: "REJECTED", updatedAt: { gte: startOfMonth(new Date()) } },
    }),
    prisma.approvalTask.count({ where }),
    prisma.approvalTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Active workflows", value: workflows, description: "Approval workflows currently active for the tenant." },
      { label: "Pending tasks", value: pending, description: "Approval tasks waiting for a decision." },
      { label: "Approved this month", value: approvedThisMonth, description: "Tasks approved during the current month." },
      { label: "Rejected this month", value: rejectedThisMonth, description: "Tasks rejected during the current month." },
    ],
    insights: [
      { title: "Queue pressure", value: `${pending}`, detail: "Monitor pending approvals to avoid operational bottlenecks." },
      { title: "Decision mix", value: `${approvedThisMonth}/${rejectedThisMonth}`, detail: "Approved vs rejected tasks this month." },
    ],
    rows: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: `${task.moduleKey.replaceAll("_", " ")} • ${task.entityType}`,
      badge: { label: task.status.replaceAll("_", " "), variant: resolveBadgeVariant(task.status) },
      fields: [
        { label: "Assigned role", value: task.assignedRole?.replaceAll("_", " ") ?? "Workflow based" },
        { label: "Current level", value: `${task.currentLevel}` },
        { label: "Comments", value: task.comments ?? "-" },
        { label: "Created", value: formatDateTime(task.createdAt) },
      ],
    })),
    exportRows: tasks.map((task) => ({
      Title: task.title,
      Module: task.moduleKey.replaceAll("_", " "),
      EntityType: task.entityType,
      Status: task.status.replaceAll("_", " "),
      AssignedRole: task.assignedRole?.replaceAll("_", " ") ?? "",
      CurrentLevel: task.currentLevel,
      CreatedAt: formatDateTime(task.createdAt),
    })),
    statusOptions: ["PENDING", "APPROVED", "REJECTED", "CANCELED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search approval title, module, or entity",
    emptyTitle: "No approval tasks yet",
    emptyDescription: "Approval workflows and request queues will appear here once leave, attendance, and payroll flows start moving.",
  };
}

async function getNotificationsWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status === "READ" ? { isRead: true } : pager.status === "UNREAD" ? { isRead: false } : {}),
    ...(pager.search
      ? {
          OR: [{ title: { contains: pager.search } }, { message: { contains: pager.search } }],
        }
      : {}),
  };

  const [total, unread, emailCapable, recentSecurity, totalRows, notifications] = await Promise.all([
    prisma.notification.count({ where: { tenantId } }),
    prisma.notification.count({ where: { tenantId, isRead: false } }),
    prisma.notification.count({ where: { tenantId, channel: { in: ["EMAIL", "BOTH"] } } }),
    prisma.notification.count({
      where: { tenantId, type: "SECURITY", createdAt: { gte: addDays(new Date(), -7) } },
    }),
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Total notifications", value: total, description: "Notifications created for this tenant workspace." },
      { label: "Unread", value: unread, description: "Unread notifications still waiting on recipients." },
      { label: "Email enabled", value: emailCapable, description: "Notifications configured for email delivery." },
      { label: "Security alerts", value: recentSecurity, description: "Security notifications generated in the last seven days." },
    ],
    insights: [
      { title: "Readiness", value: `${emailCapable}`, detail: "Notifications prepared for email or hybrid delivery." },
      { title: "Unread attention", value: `${unread}`, detail: "Unread volume can indicate communication fatigue or missed action." },
    ],
    rows: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      subtitle: notification.type.replaceAll("_", " "),
      badge: { label: notification.isRead ? "Read" : "Unread", variant: notification.isRead ? "success" : "warning" },
      fields: [
        { label: "Channel", value: notification.channel.replaceAll("_", " ") },
        { label: "Sent", value: formatDateTime(notification.sentAt) },
        { label: "Created", value: formatDateTime(notification.createdAt) },
      ],
    })),
    exportRows: notifications.map((notification) => ({
      Title: notification.title,
      Type: notification.type.replaceAll("_", " "),
      Channel: notification.channel.replaceAll("_", " "),
      Status: notification.isRead ? "Read" : "Unread",
      SentAt: formatDateTime(notification.sentAt),
      CreatedAt: formatDateTime(notification.createdAt),
    })),
    statusOptions: ["UNREAD", "READ"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search title or message",
    emptyTitle: "No notifications yet",
    emptyDescription: "Create the first in-app or email notification to begin tenant communication tracking.",
  };
}

async function getImportsWorkspace(
  tenantId: string,
  pager: { search?: string; status?: string; page: number; take: number; skip: number },
): Promise<CoreWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { originalFileName: { contains: pager.search } } : {}),
  };

  const [jobs, completed, partial, failed, totalRows, importJobs] = await Promise.all([
    prisma.importJob.count({ where: { tenantId } }),
    prisma.importJob.count({ where: { tenantId, status: "COMPLETED" } }),
    prisma.importJob.count({ where: { tenantId, status: "PARTIAL" } }),
    prisma.importJob.count({ where: { tenantId, status: "FAILED" } }),
    prisma.importJob.count({ where }),
    prisma.importJob.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Import jobs", value: jobs, description: "Bulk import jobs recorded for the tenant." },
      { label: "Completed", value: completed, description: "Import jobs that completed without row failures." },
      { label: "Partial", value: partial, description: "Import jobs that completed with mixed success." },
      { label: "Failed", value: failed, description: "Import jobs that failed and need remediation." },
    ],
    insights: [
      { title: "Import reliability", value: `${completed}`, detail: "Completed imports without row-level failure." },
      { title: "Error watch", value: `${partial + failed}`, detail: "Jobs that need follow-up or corrected source files." },
    ],
    rows: importJobs.map((job) => ({
      id: job.id,
      title: `${job.type.replaceAll("_", " ")} import`,
      subtitle: job.originalFileName,
      badge: { label: job.status.replaceAll("_", " "), variant: resolveBadgeVariant(job.status) },
      fields: [
        {
          label: "Requested by",
          value: job.user
            ? `${[job.user.firstName, job.user.lastName].filter(Boolean).join(" ")} (${job.user.email})`
            : "System",
        },
        { label: "Rows", value: `${job.successRows}/${job.totalRows}` },
        { label: "Failed rows", value: `${job.failedRows}` },
        { label: "Created", value: formatDateTime(job.createdAt) },
      ],
    })),
    exportRows: importJobs.map((job) => ({
      Type: job.type.replaceAll("_", " "),
      FileName: job.originalFileName,
      Status: job.status.replaceAll("_", " "),
      TotalRows: job.totalRows,
      SuccessRows: job.successRows,
      FailedRows: job.failedRows,
      CreatedAt: formatDateTime(job.createdAt),
    })),
    statusOptions: ["PENDING", "COMPLETED", "PARTIAL", "FAILED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search file name",
    emptyTitle: "No import jobs yet",
    emptyDescription: "Bulk import history will appear here after the first user or employee upload runs.",
  };
}
