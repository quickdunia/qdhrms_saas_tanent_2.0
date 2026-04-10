import {
  AssetAssignmentStatus,
  CandidateStage,
  DocumentAudience,
  EmploymentType,
  ExitRequestType,
  FormAssignmentScope,
  IntegrationEndpointStatus,
  IntegrationProviderType,
  InterviewType,
  JobOpeningStatus,
  Role,
  TaskPriority,
  TicketPriority,
} from "@prisma/client";
import { z } from "zod";

import { optionalTextSchema, optionalUrlSchema, safeRedirectSchema } from "@/lib/validation/shared";

export const createJobOpeningSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2, "Job title is required."),
  code: z.string().trim().min(2, "Job code is required."),
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  description: optionalTextSchema,
  openingsCount: z.coerce.number().int().min(1).max(500),
  minExperienceYears: optionalTextSchema,
  maxExperienceYears: optionalTextSchema,
  salaryMin: optionalTextSchema,
  salaryMax: optionalTextSchema,
  closesAt: optionalTextSchema,
  status: z.nativeEnum(JobOpeningStatus).default(JobOpeningStatus.OPEN),
  redirectTo: safeRedirectSchema,
});

export const createCandidateSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  jobOpeningId: z.string().trim().min(1),
  firstName: z.string().trim().min(2),
  lastName: optionalTextSchema,
  email: z.string().trim().email(),
  phone: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  source: optionalTextSchema,
  currentCompany: optionalTextSchema,
  experienceYears: z.coerce.number().int().min(0).max(50).default(0),
  coverLetter: optionalTextSchema,
  notes: optionalTextSchema,
  stage: z.nativeEnum(CandidateStage).default(CandidateStage.APPLIED),
  redirectTo: safeRedirectSchema,
});

export const scheduleInterviewSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  candidateId: z.string().trim().min(1),
  interviewType: z.nativeEnum(InterviewType),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  mode: optionalTextSchema,
  panelJson: optionalTextSchema,
  remarks: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const convertCandidateSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  candidateId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
  employeeCode: z.string().trim().min(2),
  jobTitle: z.string().trim().min(2),
  employmentType: z.nativeEnum(EmploymentType),
  joinDate: z.string().trim().min(1),
  assignedRole: optionalTextSchema,
  onboardingCode: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createOnboardingPlanSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  onboardingCode: z.string().trim().min(2),
  employeeId: optionalTextSchema,
  candidateId: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  assignedRole: optionalTextSchema,
  joiningDate: z.string().trim().min(1),
  probationDays: z.coerce.number().int().min(1).max(365).default(90),
  notes: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createOffboardingRequestSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  exitCode: z.string().trim().min(2),
  type: z.nativeEnum(ExitRequestType),
  reason: z.string().trim().min(5),
  noticeStartAt: optionalTextSchema,
  noticeEndAt: optionalTextSchema,
  lastWorkingDay: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createAssetCategorySchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  description: optionalTextSchema,
  warrantyTemplateDays: optionalTextSchema,
  amcCycleDays: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createAssetItemSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  categoryId: z.string().trim().min(1),
  branchId: optionalTextSchema,
  assetCode: z.string().trim().min(2),
  name: z.string().trim().min(2),
  brand: optionalTextSchema,
  model: optionalTextSchema,
  serialNumber: optionalTextSchema,
  locationLabel: optionalTextSchema,
  purchaseDate: optionalTextSchema,
  purchaseCost: optionalTextSchema,
  warrantyExpiry: optionalTextSchema,
  amcExpiry: optionalTextSchema,
  notes: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const assignAssetSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  assetId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  dueBackAt: optionalTextSchema,
  issueRemarks: optionalTextSchema,
  status: z.nativeEnum(AssetAssignmentStatus).default(AssetAssignmentStatus.ISSUED),
  redirectTo: safeRedirectSchema,
});

export const createHelpdeskTicketSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  ticketNumber: z.string().trim().min(2),
  employeeId: optionalTextSchema,
  assignedToId: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  category: z.string().trim().min(2),
  subject: z.string().trim().min(2),
  description: z.string().trim().min(5),
  priority: z.nativeEnum(TicketPriority),
  redirectTo: safeRedirectSchema,
});

export const addTicketCommentSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  ticketId: z.string().trim().min(1),
  message: z.string().trim().min(2),
  isInternal: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createDynamicFormSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  code: z.string().trim().min(2),
  description: optionalTextSchema,
  schemaJson: z.string().trim().min(2),
  scope: z.nativeEnum(FormAssignmentScope),
  targetValue: optionalTextSchema,
  startsAt: optionalTextSchema,
  endsAt: optionalTextSchema,
  allowDrafts: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const submitDynamicFormResponseSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  formId: z.string().trim().min(1),
  employeeId: optionalTextSchema,
  responseJson: z.string().trim().min(2),
  redirectTo: safeRedirectSchema,
});

export const createPerformanceKpiSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  code: z.string().trim().min(2),
  description: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  roleName: optionalTextSchema,
  weight: z.coerce.number().min(0).max(100),
  redirectTo: safeRedirectSchema,
});

export const createAppraisalCycleSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  redirectTo: safeRedirectSchema,
});

export const createTrainingProgramSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  code: z.string().trim().min(2),
  description: optionalTextSchema,
  trainerName: optionalTextSchema,
  venue: optionalTextSchema,
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  capacity: optionalTextSchema,
  mandatory: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const nominateEmployeeSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  programId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  redirectTo: safeRedirectSchema,
});

export const createInternalTaskSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  description: optionalTextSchema,
  assignedToId: optionalTextSchema,
  branchId: optionalTextSchema,
  departmentId: optionalTextSchema,
  workflowLane: optionalTextSchema,
  dueAt: optionalTextSchema,
  reminderAt: optionalTextSchema,
  priority: z.nativeEnum(TaskPriority),
  redirectTo: safeRedirectSchema,
});

export const upsertIntegrationEndpointSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  providerType: z.nativeEnum(IntegrationProviderType),
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  endpointUrl: optionalUrlSchema,
  authType: optionalTextSchema,
  configJson: optionalTextSchema,
  webhookSecret: optionalTextSchema,
  status: z.nativeEnum(IntegrationEndpointStatus),
  redirectTo: safeRedirectSchema,
});

export const createDocumentFolderSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  parentId: optionalTextSchema,
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  scope: z.nativeEnum(DocumentAudience),
  branchId: optionalTextSchema,
  employeeId: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const uploadVaultDocumentSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  folderId: z.string().trim().min(1),
  title: z.string().trim().min(2),
  category: z.string().trim().min(2),
  description: optionalTextSchema,
  branchId: optionalTextSchema,
  employeeId: optionalTextSchema,
  expiresAt: optionalTextSchema,
  visibility: z.nativeEnum(DocumentAudience),
  redirectTo: safeRedirectSchema,
});

export const phaseTwoAccountRoleSchema = z
  .string()
  .optional()
  .refine((value) => !value || Object.values(Role).includes(value as Role), {
    message: "Please select a valid role.",
  });
