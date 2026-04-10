import {
  AttendanceRequestType,
  AttendanceSource,
  BillingCycle,
  HolidayScope,
  NoticePriority,
  NoticeScope,
  NotificationChannel,
  NotificationType,
  PayrollRunStatus,
  Role,
  SubscriptionStatus,
} from "@prisma/client";
import { z } from "zod";

import { MODULE_KEYS } from "@/lib/auth/constants";
import {
  optionalTextSchema,
  safeRedirectSchema,
} from "@/lib/validation/shared";

export const createPlanSchema = z.object({
  code: z.string().trim().min(2, "Plan code is required."),
  name: z.string().trim().min(2, "Plan name is required."),
  description: optionalTextSchema,
  priceMonthly: z.coerce.number().min(0),
  priceQuarterly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  maxUsers: optionalTextSchema,
  maxEmployees: optionalTextSchema,
  maxColleges: optionalTextSchema,
  maxBranches: optionalTextSchema,
  maxDepartments: optionalTextSchema,
  storageLimitMb: optionalTextSchema,
  renewalReminderDays: z.coerce.number().int().min(1).max(60),
  moduleKeys: z.string().trim().min(1, "Provide at least one module key."),
  redirectTo: safeRedirectSchema,
});

export const updateTenantStatusSchema = z.object({
  tenantId: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "TRIALING", "HOLD", "SUSPENDED", "INACTIVE", "DELETED"]),
  redirectTo: safeRedirectSchema,
});

export const createGlobalSettingSchema = z.object({
  key: z.string().trim().min(2),
  category: z.string().trim().min(2),
  label: z.string().trim().min(2),
  valueText: optionalTextSchema,
  valueJson: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createUserSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: optionalTextSchema,
  email: z.string().trim().email("Enter a valid email address."),
  phone: optionalTextSchema,
  role: z.nativeEnum(Role),
  status: z.enum(["PENDING", "ACTIVE", "HOLD", "SUSPENDED", "LOCKED", "DELETED"]),
  collegeId: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const updateUserStatusSchema = z.object({
  userId: z.string().trim().min(1),
  tenantSlug: z.string().trim().min(1),
  status: z.enum(["PENDING", "ACTIVE", "HOLD", "SUSPENDED", "LOCKED", "DELETED"]),
  redirectTo: safeRedirectSchema,
});

export const createRolePermissionSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  role: z.nativeEnum(Role),
  moduleKey: z.enum(MODULE_KEYS),
  canView: optionalTextSchema,
  canAdd: optionalTextSchema,
  canEdit: optionalTextSchema,
  canDelete: optionalTextSchema,
  canApprove: optionalTextSchema,
  canExport: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createShiftSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  branchId: optionalTextSchema,
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  graceInMinutes: z.coerce.number().int().min(0),
  graceOutMinutes: z.coerce.number().int().min(0),
  halfDayMinutes: z.coerce.number().int().min(1),
  fullDayMinutes: z.coerce.number().int().min(1),
  overtimeThresholdMinutes: z.coerce.number().int().min(1),
  isFlexible: optionalTextSchema,
  weeklyOffs: z.string().trim().min(1),
  redirectTo: safeRedirectSchema,
});

export const createAttendanceSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  shiftId: optionalTextSchema,
  attendanceDate: z.string().trim().min(1),
  checkInAt: optionalTextSchema,
  checkOutAt: optionalTextSchema,
  remarks: optionalTextSchema,
  source: z.nativeEnum(AttendanceSource),
  redirectTo: safeRedirectSchema,
});

export const createAttendanceRequestSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  attendanceRecordId: optionalTextSchema,
  type: z.nativeEnum(AttendanceRequestType),
  requestedDate: z.string().trim().min(1),
  requestedCheckInAt: optionalTextSchema,
  requestedCheckOutAt: optionalTextSchema,
  reason: z.string().trim().min(5),
  redirectTo: safeRedirectSchema,
});

export const createLeaveTypeSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  description: optionalTextSchema,
  annualQuota: z.coerce.number().min(0),
  allowCarryForward: optionalTextSchema,
  allowHalfDay: optionalTextSchema,
  allowShortLeave: optionalTextSchema,
  isPaid: optionalTextSchema,
  requiresApproval: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createLeaveRequestSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  leaveTypeId: z.string().trim().min(1),
  durationType: z.enum(["FULL_DAY", "HALF_DAY", "SHORT"]),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  totalDays: z.coerce.number().min(0.25),
  reason: z.string().trim().min(5),
  redirectTo: safeRedirectSchema,
});

export const updateRequestStatusSchema = z.object({
  id: z.string().trim().min(1),
  tenantSlug: z.string().trim().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELED"]),
  reviewComment: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createHolidaySchema = z.object({
  tenantSlug: z.string().trim().min(1),
  branchId: optionalTextSchema,
  name: z.string().trim().min(2),
  holidayDate: z.string().trim().min(1),
  scope: z.nativeEnum(HolidayScope),
  description: optionalTextSchema,
  isOptional: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createSalaryStructureSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  baseSalary: z.coerce.number().min(0),
  allowances: z.string().trim().min(2),
  deductions: z.string().trim().min(2),
  redirectTo: safeRedirectSchema,
});

export const createPayrollRunSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  branchId: optionalTextSchema,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  status: z.nativeEnum(PayrollRunStatus).optional(),
  notes: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createAnnouncementSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  content: z.string().trim().min(5),
  scope: z.nativeEnum(NoticeScope),
  priority: z.nativeEnum(NoticePriority),
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  targetEmployeeId: optionalTextSchema,
  expiresAt: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createNotificationSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  userId: optionalTextSchema,
  employeeId: optionalTextSchema,
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  title: z.string().trim().min(2),
  message: z.string().trim().min(5),
  link: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createApprovalWorkflowSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  moduleKey: z.enum(MODULE_KEYS),
  name: z.string().trim().min(2),
  stepOneRole: z.nativeEnum(Role),
  stepTwoRole: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const updateTenantSettingsSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  companySettings: optionalTextSchema,
  attendanceSettings: optionalTextSchema,
  leaveSettings: optionalTextSchema,
  payrollSettings: optionalTextSchema,
  smtpSettings: optionalTextSchema,
  idGenerationRules: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const bulkImportContextSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  type: z.enum(["USERS", "EMPLOYEES", "ATTENDANCE"]),
  redirectTo: safeRedirectSchema,
});

export const updateSubscriptionExtendedSchema = z.object({
  tenantId: z.string().trim().min(1),
  planId: z.string().trim().min(1),
  status: z.nativeEnum(SubscriptionStatus),
  billingCycle: z.nativeEnum(BillingCycle),
  endsAt: optionalTextSchema,
  moduleOverrides: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});
