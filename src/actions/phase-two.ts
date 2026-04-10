"use server";

import { addDays } from "date-fns";
import { ApprovalStatus, EmploymentType, OtpPurpose, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { requireTenantModulePermission } from "@/lib/auth/guards";
import { issuePasswordOtp } from "@/lib/auth/otp";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/files/upload";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { parseFormData, parseJsonString } from "@/lib/utils";
import {
  addTicketCommentSchema,
  assignAssetSchema,
  convertCandidateSchema,
  createAppraisalCycleSchema,
  createAssetCategorySchema,
  createAssetItemSchema,
  createCandidateSchema,
  createDocumentFolderSchema,
  createDynamicFormSchema,
  createHelpdeskTicketSchema,
  createInternalTaskSchema,
  createJobOpeningSchema,
  createOffboardingRequestSchema,
  createOnboardingPlanSchema,
  createPerformanceKpiSchema,
  createTrainingProgramSchema,
  nominateEmployeeSchema,
  scheduleInterviewSchema,
  submitDynamicFormResponseSchema,
  uploadVaultDocumentSchema,
  upsertIntegrationEndpointSchema,
} from "@/lib/validation/phase-two";

function buildModulePath(tenantSlug: string, moduleSlug: string) {
  return `/t/${tenantSlug}/${moduleSlug}`;
}

function parseOptionalNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value?: string) {
  return value ? new Date(value) : null;
}

function parseOptionalRole(value?: string) {
  if (!value) {
    return null;
  }

  return Object.values(Role).includes(value as Role) ? (value as Role) : null;
}

function buildOnboardingDefaults(planId: string) {
  return {
    checklistItems: [
      { onboardingPlanId: planId, title: "Offer and joining confirmation", category: "Pre-joining" },
      { onboardingPlanId: planId, title: "ID card and workspace ready", category: "Day one" },
      { onboardingPlanId: planId, title: "Manager introduction and goals", category: "Orientation" },
      { onboardingPlanId: planId, title: "Probation review scheduled", category: "Follow-up" },
    ],
    documents: [
      { onboardingPlanId: planId, title: "Government ID", required: true },
      { onboardingPlanId: planId, title: "Address proof", required: true },
      { onboardingPlanId: planId, title: "Academic certificates", required: true },
    ],
    policies: [
      { onboardingPlanId: planId, policyName: "Code of conduct", version: "v1" },
      { onboardingPlanId: planId, policyName: "Information security policy", version: "v1" },
    ],
  };
}

async function provisionEmployeePortalAccess(input: {
  tenantId: string;
  tenantName: string;
  employeeId: string;
  assignedRole?: Role | null;
}) {
  const employee = await prisma.employee.findUnique({
    where: {
      id: input.employeeId,
    },
  });

  if (!employee) {
    return {
      userId: null,
      otpIssued: false,
      emailSent: false,
    };
  }

  const primaryEmail = employee.workEmail ?? employee.personalEmail;

  if (!primaryEmail) {
    return {
      userId: employee.userAccountId ?? null,
      otpIssued: false,
      emailSent: false,
    };
  }

  let user =
    employee.userAccountId
      ? await prisma.user.findUnique({
          where: {
            id: employee.userAccountId,
          },
        })
      : await prisma.user.findUnique({
          where: {
            email: primaryEmail,
          },
        });

  if (user && user.role === Role.SUPER_ADMIN) {
    throw new Error("That email address is already reserved for a platform account.");
  }

  if (user && user.tenantId && user.tenantId !== input.tenantId) {
    throw new Error("That email address already belongs to another tenant workspace.");
  }

  const targetRole = input.assignedRole ?? Role.EMPLOYEE;

  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: input.tenantId,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: primaryEmail,
        phone: employee.phone,
        role: targetRole,
        status: "PENDING",
        mustSetPassword: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        tenantId: input.tenantId,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        role: user.role === Role.SUPER_ADMIN ? user.role : targetRole,
      },
    });
  }

  if (!employee.userAccountId) {
    await prisma.employee.update({
      where: {
        id: employee.id,
      },
      data: {
        userAccountId: user.id,
      },
    });
  }

  let otpIssued = false;
  if (!user.passwordHash || user.mustSetPassword) {
    await issuePasswordOtp({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenant: {
          name: input.tenantName,
        },
      },
      purpose: OtpPurpose.CREATE_PASSWORD,
    });
    otpIssued = true;
  }

  await sendMail({
    to: primaryEmail,
    subject: `Welcome to ${input.tenantName}`,
    text: `Your employee portal is ready. Sign in or create your password from the QD HRMS Cloud login experience.`,
    html: `<p>Your employee portal is ready.</p><p>Use the secure password setup flow to access ${input.tenantName}.</p>`,
  });

  return {
    userId: user.id,
    otpIssued,
    emailSent: true,
  };
}

async function recordCandidateResume(input: {
  tenantId: string;
  candidateId: string;
  uploadedById: string;
  file: File;
}) {
  return recordOwnedFileAsset({
    tenantId: input.tenantId,
    ownerType: "CANDIDATE",
    ownerId: input.candidateId,
    category: "RESUME",
    uploadedById: input.uploadedById,
    file: input.file,
    pathSegments: [input.tenantId, "candidate", input.candidateId],
  });
}

async function recordOwnedFileAsset(input: {
  tenantId: string;
  ownerType: "CANDIDATE" | "TICKET" | "FORM_RESPONSE" | "DOCUMENT";
  ownerId: string;
  category: string;
  uploadedById: string;
  file: File;
  pathSegments: string[];
}) {
  const uploaded = await saveUploadedFile(input.file, input.pathSegments, {
    kind: "document",
  });

  if (!uploaded) {
    return null;
  }

  await prisma.fileAsset.create({
    data: {
      tenantId: input.tenantId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      category: input.category,
      originalName: uploaded.originalName,
      fileUrl: uploaded.fileUrl,
      filePath: uploaded.filePath,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedById: input.uploadedById,
    },
  });

  return uploaded;
}

export async function createJobOpeningAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "recruitment"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "RECRUITMENT", "add");
    const parsed = createJobOpeningSchema.parse(rawData);

    const jobOpening = await prisma.jobOpening.create({
      data: {
        tenantId: session.tenant.id,
        title: parsed.title,
        code: parsed.code.toUpperCase(),
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        description: parsed.description,
        openingsCount: parsed.openingsCount,
        minExperienceYears: parseOptionalNumber(parsed.minExperienceYears),
        maxExperienceYears: parseOptionalNumber(parsed.maxExperienceYears),
        salaryMin: parseOptionalNumber(parsed.salaryMin),
        salaryMax: parseOptionalNumber(parsed.salaryMax),
        closesAt: parseOptionalDate(parsed.closesAt),
        status: parsed.status,
        createdById: session.user.id,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "RECRUITMENT",
      action: "CREATE",
      entityType: "JobOpening",
      entityId: jobOpening.id,
      summary: `Created job opening ${jobOpening.code}.`,
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Job opening created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the job opening."));
  }
}

export async function createCandidateAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "recruitment"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "RECRUITMENT", "add");
    const parsed = createCandidateSchema.parse(rawData);

    const candidate = await prisma.candidate.create({
      data: {
        tenantId: session.tenant.id,
        jobOpeningId: parsed.jobOpeningId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email.toLowerCase(),
        phone: parsed.phone,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        source: parsed.source,
        currentCompany: parsed.currentCompany,
        experienceYears: parsed.experienceYears,
        coverLetter: parsed.coverLetter,
        notes: parsed.notes,
        stage: parsed.stage,
      },
    });

    const resume = formData.get("resume");
    if (resume instanceof File && resume.size > 0) {
      const uploaded = await recordCandidateResume({
        tenantId: session.tenant.id,
        candidateId: candidate.id,
        uploadedById: session.user.id,
        file: resume,
      });

      if (uploaded) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            resumeUrl: uploaded.fileUrl,
          },
        });
      }
    }

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Candidate added to the hiring pipeline.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to add the candidate."));
  }
}

export async function scheduleInterviewAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "recruitment"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "RECRUITMENT", "edit");
    const parsed = scheduleInterviewSchema.parse(rawData);

    await prisma.interviewSchedule.create({
      data: {
        tenantId: session.tenant.id,
        candidateId: parsed.candidateId,
        interviewType: parsed.interviewType,
        scheduledAt: new Date(parsed.scheduledAt),
        durationMinutes: parsed.durationMinutes,
        mode: parsed.mode,
        panelJson: parseJsonString(parsed.panelJson, []),
        remarks: parsed.remarks,
        createdById: session.user.id,
      },
    });

    await prisma.candidate.update({
      where: {
        id: parsed.candidateId,
      },
      data: {
        stage: "INTERVIEW",
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Interview scheduled successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to schedule the interview."));
  }
}

export async function convertCandidateToEmployeeAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "recruitment"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "RECRUITMENT", "approve");
    const parsed = convertCandidateSchema.parse(rawData);

    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parsed.candidateId,
        tenantId: session.tenant.id,
      },
    });

    if (!candidate) {
      redirectWithMessage(redirectTo, "error", "Candidate not found.");
    }

    if (candidate.convertedEmployeeId) {
      redirectWithMessage(redirectTo, "error", "This candidate has already been converted.");
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        employeeCode: parsed.employeeCode.toUpperCase(),
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        workEmail: candidate.email,
        phone: candidate.phone,
        jobTitle: parsed.jobTitle,
        employmentType: parsed.employmentType ?? EmploymentType.FULL_TIME,
        status: "PROBATION",
        joinDate: new Date(parsed.joinDate),
        createdById: session.user.id,
      },
    });

    const assignedRole = parseOptionalRole(parsed.assignedRole) ?? Role.EMPLOYEE;
    const onboardingCode = parsed.onboardingCode?.toUpperCase() ?? `ONB-${employee.employeeCode}`;
    const probationStartAt = new Date(parsed.joinDate);
    const probationEndAt = addDays(probationStartAt, 90);

    const onboardingPlan = await prisma.onboardingPlan.create({
      data: {
        tenantId: session.tenant.id,
        employeeId: employee.id,
        candidateId: candidate.id,
        onboardingCode,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        assignedRole,
        joiningDate: probationStartAt,
        probationStartAt,
        probationEndAt,
        status: "IN_PROGRESS",
        createdById: session.user.id,
      },
    });

    const defaults = buildOnboardingDefaults(onboardingPlan.id);
    await prisma.onboardingChecklistItem.createMany({ data: defaults.checklistItems });
    await prisma.onboardingDocument.createMany({ data: defaults.documents });
    await prisma.onboardingPolicyAcceptance.createMany({ data: defaults.policies });

    const access = await provisionEmployeePortalAccess({
      tenantId: session.tenant.id,
      tenantName: session.tenant.name,
      employeeId: employee.id,
      assignedRole,
    });

    await prisma.onboardingPlan.update({
      where: { id: onboardingPlan.id },
      data: {
        firstLoginReadyAt: access.otpIssued ? new Date() : null,
        welcomeEmailSentAt: access.emailSent ? new Date() : null,
      },
    });

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        stage: "HIRED",
        convertedEmployeeId: employee.id,
        convertedAt: new Date(),
      },
    });

    revalidatePath(redirectTo);
    revalidatePath(buildModulePath(tenantSlug, "onboarding"));
    redirectWithMessage(redirectTo, "success", "Candidate converted to employee and onboarding started.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to convert the candidate."));
  }
}

export async function createOnboardingPlanAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "onboarding"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ONBOARDING", "add");
    const parsed = createOnboardingPlanSchema.parse(rawData);
    const assignedRole = parseOptionalRole(parsed.assignedRole) ?? Role.EMPLOYEE;
    const joiningDate = new Date(parsed.joiningDate);
    const probationEndAt = addDays(joiningDate, parsed.probationDays);

    const onboardingPlan = await prisma.onboardingPlan.create({
      data: {
        tenantId: session.tenant.id,
        employeeId: parsed.employeeId,
        candidateId: parsed.candidateId,
        onboardingCode: parsed.onboardingCode.toUpperCase(),
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        assignedRole,
        joiningDate,
        probationStartAt: joiningDate,
        probationEndAt,
        notes: parsed.notes,
        status: "PENDING",
        createdById: session.user.id,
      },
    });

    const defaults = buildOnboardingDefaults(onboardingPlan.id);
    await prisma.onboardingChecklistItem.createMany({ data: defaults.checklistItems });
    await prisma.onboardingDocument.createMany({ data: defaults.documents });
    await prisma.onboardingPolicyAcceptance.createMany({ data: defaults.policies });

    if (parsed.employeeId) {
      const access = await provisionEmployeePortalAccess({
        tenantId: session.tenant.id,
        tenantName: session.tenant.name,
        employeeId: parsed.employeeId,
        assignedRole,
      });

      await prisma.onboardingPlan.update({
        where: { id: onboardingPlan.id },
        data: {
          firstLoginReadyAt: access.otpIssued ? new Date() : null,
          welcomeEmailSentAt: access.emailSent ? new Date() : null,
          status: "IN_PROGRESS",
        },
      });
    }

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Onboarding plan created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the onboarding plan."));
  }
}

export async function createOffboardingRequestAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "offboarding"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "OFFBOARDING", "add");
    const parsed = createOffboardingRequestSchema.parse(rawData);

    await prisma.offboardingRequest.create({
      data: {
        tenantId: session.tenant.id,
        employeeId: parsed.employeeId,
        exitCode: parsed.exitCode.toUpperCase(),
        type: parsed.type,
        reason: parsed.reason,
        noticeStartAt: parseOptionalDate(parsed.noticeStartAt),
        noticeEndAt: parseOptionalDate(parsed.noticeEndAt),
        lastWorkingDay: parseOptionalDate(parsed.lastWorkingDay),
        settlementStatus: ApprovalStatus.PENDING,
        status: "REQUESTED",
        createdById: session.user.id,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Offboarding request logged successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the offboarding request."));
  }
}

export async function createAssetCategoryAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "assets"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ASSET_MANAGEMENT", "add");
    const parsed = createAssetCategorySchema.parse(rawData);

    await prisma.assetCategory.create({
      data: {
        tenantId: session.tenant.id,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
        warrantyTemplateDays: parseOptionalNumber(parsed.warrantyTemplateDays),
        amcCycleDays: parseOptionalNumber(parsed.amcCycleDays),
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Asset category created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the asset category."));
  }
}

export async function createAssetItemAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "assets"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ASSET_MANAGEMENT", "add");
    const parsed = createAssetItemSchema.parse(rawData);

    await prisma.asset.create({
      data: {
        tenantId: session.tenant.id,
        categoryId: parsed.categoryId,
        branchId: parsed.branchId,
        assetCode: parsed.assetCode.toUpperCase(),
        name: parsed.name,
        brand: parsed.brand,
        model: parsed.model,
        serialNumber: parsed.serialNumber,
        locationLabel: parsed.locationLabel,
        purchaseDate: parseOptionalDate(parsed.purchaseDate),
        purchaseCost: parseOptionalNumber(parsed.purchaseCost),
        warrantyExpiry: parseOptionalDate(parsed.warrantyExpiry),
        amcExpiry: parseOptionalDate(parsed.amcExpiry),
        notes: parsed.notes,
        condition: "NEW",
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Asset registered successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to register the asset."));
  }
}

export async function assignAssetAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "assets"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ASSET_MANAGEMENT", "edit");
    const parsed = assignAssetSchema.parse(rawData);

    const existingAssignment = await prisma.assetAssignment.findFirst({
      where: {
        tenantId: session.tenant.id,
        assetId: parsed.assetId,
        status: "ISSUED",
      },
    });

    if (existingAssignment) {
      redirectWithMessage(redirectTo, "error", "That asset is already assigned.");
    }

    await prisma.assetAssignment.create({
      data: {
        tenantId: session.tenant.id,
        assetId: parsed.assetId,
        employeeId: parsed.employeeId,
        dueBackAt: parseOptionalDate(parsed.dueBackAt),
        issueRemarks: parsed.issueRemarks,
        status: parsed.status,
        approvedById: session.user.id,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Asset assigned successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to assign the asset."));
  }
}

export async function createHelpdeskTicketAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "helpdesk"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "HELPDESK", "add");
    const parsed = createHelpdeskTicketSchema.parse(rawData);

    if (parsed.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: parsed.employeeId,
          tenantId: session.tenant.id,
        },
        select: {
          id: true,
        },
      });

      if (!employee) {
        redirectWithMessage(redirectTo, "error", "The selected employee was not found in this tenant.");
      }
    }

    if (parsed.assignedToId) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: parsed.assignedToId,
          tenantId: session.tenant.id,
        },
        select: {
          id: true,
        },
      });

      if (!assignedUser) {
        redirectWithMessage(redirectTo, "error", "The selected assignee was not found in this tenant.");
      }
    }

    const ticket = await prisma.helpdeskTicket.create({
      data: {
        tenantId: session.tenant.id,
        ticketNumber: parsed.ticketNumber.toUpperCase(),
        employeeId: parsed.employeeId,
        createdById: session.user.id,
        assignedToId: parsed.assignedToId,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        category: parsed.category,
        subject: parsed.subject,
        description: parsed.description,
        priority: parsed.priority,
      },
    });

    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      const uploaded = await recordOwnedFileAsset({
        tenantId: session.tenant.id,
        ownerType: "TICKET",
        ownerId: ticket.id,
        category: "ATTACHMENT",
        uploadedById: session.user.id,
        file: attachment,
        pathSegments: [session.tenant.id, "ticket", ticket.id],
      });

      if (uploaded) {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: session.user.id,
            message: `Attachment uploaded: ${uploaded.originalName}`,
            isInternal: false,
            attachmentUrl: uploaded.fileUrl,
          },
        });
      }
    }

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "HELPDESK",
      action: "CREATE",
      entityType: "HelpdeskTicket",
      entityId: ticket.id,
      summary: `Created helpdesk ticket ${ticket.ticketNumber}.`,
      payload: {
        priority: parsed.priority,
        assignedToId: parsed.assignedToId,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Ticket created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the ticket."));
  }
}

export async function addTicketCommentAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "helpdesk"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "HELPDESK", "edit");
    const parsed = addTicketCommentSchema.parse(rawData);

    await prisma.ticketComment.create({
      data: {
        ticketId: parsed.ticketId,
        authorId: session.user.id,
        message: parsed.message,
        isInternal: parsed.isInternal === "on" || parsed.isInternal === "true",
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Comment added successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to add the comment."));
  }
}

export async function createDynamicFormAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "forms"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "DYNAMIC_FORMS", "add");
    const parsed = createDynamicFormSchema.parse(rawData);
    const schema = parseJsonString<Prisma.InputJsonValue[]>(parsed.schemaJson, []);

    if (!Array.isArray(schema) || schema.some((field) => !field || typeof field !== "object")) {
      redirectWithMessage(redirectTo, "error", "Form schema must be a valid JSON array of field definitions.");
    }

    const form = await prisma.dynamicForm.create({
      data: {
        tenantId: session.tenant.id,
        title: parsed.title,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
        schema: schema as Prisma.InputJsonArray,
        allowDrafts: parsed.allowDrafts === "on" || parsed.allowDrafts === "true",
        createdById: session.user.id,
      },
    });

    await prisma.dynamicFormAssignment.create({
      data: {
        formId: form.id,
        scope: parsed.scope,
        targetValue: parsed.targetValue,
        startsAt: parseOptionalDate(parsed.startsAt),
        endsAt: parseOptionalDate(parsed.endsAt),
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "DYNAMIC_FORMS",
      action: "CREATE",
      entityType: "DynamicForm",
      entityId: form.id,
      summary: `Created dynamic form ${form.title}.`,
      payload: {
        scope: parsed.scope,
        allowDrafts: parsed.allowDrafts === "on" || parsed.allowDrafts === "true",
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Custom form created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the form."));
  }
}

export async function submitDynamicFormResponseAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "forms"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "DYNAMIC_FORMS", "add");
    const parsed = submitDynamicFormResponseSchema.parse(rawData);
    const form = await prisma.dynamicForm.findFirst({
      where: {
        id: parsed.formId,
        tenantId: session.tenant.id,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!form) {
      redirectWithMessage(redirectTo, "error", "The selected form was not found in this tenant.");
    }

    if (parsed.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: parsed.employeeId,
          tenantId: session.tenant.id,
        },
        select: {
          id: true,
        },
      });

      if (!employee) {
        redirectWithMessage(redirectTo, "error", "The selected employee was not found in this tenant.");
      }
    }

    const response = await prisma.dynamicFormResponse.create({
      data: {
        tenantId: session.tenant.id,
        formId: parsed.formId,
        employeeId: parsed.employeeId,
        userId: session.user.id,
        responseJson: parseJsonString(parsed.responseJson, {}),
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      await recordOwnedFileAsset({
        tenantId: session.tenant.id,
        ownerType: "FORM_RESPONSE",
        ownerId: response.id,
        category: "ATTACHMENT",
        uploadedById: session.user.id,
        file: attachment,
        pathSegments: [session.tenant.id, "dynamic-form-response", response.id],
      });
    }

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "DYNAMIC_FORMS",
      action: "SUBMIT",
      entityType: "DynamicFormResponse",
      entityId: response.id,
      summary: `Captured response for ${form.title}.`,
      payload: {
        formId: form.id,
        employeeId: parsed.employeeId,
        hasAttachment: attachment instanceof File && attachment.size > 0,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Form response captured successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to save the response."));
  }
}

export async function createPerformanceKpiAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "performance"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "PERFORMANCE", "add");
    const parsed = createPerformanceKpiSchema.parse(rawData);

    await prisma.performanceKpi.create({
      data: {
        tenantId: session.tenant.id,
        title: parsed.title,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        roleName: parsed.roleName,
        weight: parsed.weight,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "KPI created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the KPI."));
  }
}

export async function createAppraisalCycleAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "performance"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "PERFORMANCE", "add");
    const parsed = createAppraisalCycleSchema.parse(rawData);

    await prisma.appraisalCycle.create({
      data: {
        tenantId: session.tenant.id,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        createdById: session.user.id,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Appraisal cycle created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the appraisal cycle."));
  }
}

export async function createTrainingProgramAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "training"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "TRAINING", "add");
    const parsed = createTrainingProgramSchema.parse(rawData);

    await prisma.trainingProgram.create({
      data: {
        tenantId: session.tenant.id,
        title: parsed.title,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
        trainerName: parsed.trainerName,
        venue: parsed.venue,
        startsAt: new Date(parsed.startsAt),
        endsAt: new Date(parsed.endsAt),
        capacity: parseOptionalNumber(parsed.capacity),
        mandatory: parsed.mandatory === "on" || parsed.mandatory === "true",
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Training program created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the training program."));
  }
}

export async function nominateEmployeeAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "training"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "TRAINING", "add");
    const parsed = nominateEmployeeSchema.parse(rawData);

    await prisma.trainingNomination.create({
      data: {
        tenantId: session.tenant.id,
        programId: parsed.programId,
        employeeId: parsed.employeeId,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Employee nominated successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to nominate the employee."));
  }
}

export async function createInternalTaskAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "workflows"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "WORKFLOWS", "add");
    const parsed = createInternalTaskSchema.parse(rawData);

    await prisma.internalTask.create({
      data: {
        tenantId: session.tenant.id,
        title: parsed.title,
        description: parsed.description,
        assignedToId: parsed.assignedToId,
        assignedById: session.user.id,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        workflowLane: parsed.workflowLane,
        dueAt: parseOptionalDate(parsed.dueAt),
        reminderAt: parseOptionalDate(parsed.reminderAt),
        priority: parsed.priority,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Internal workflow task created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the workflow task."));
  }
}

export async function upsertIntegrationEndpointAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "integrations"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "INTEGRATIONS", "edit");
    const parsed = upsertIntegrationEndpointSchema.parse(rawData);

    await prisma.integrationEndpoint.upsert({
      where: {
        tenantId_code: {
          tenantId: session.tenant.id,
          code: parsed.code.toUpperCase(),
        },
      },
      update: {
        providerType: parsed.providerType,
        name: parsed.name,
        endpointUrl: parsed.endpointUrl,
        authType: parsed.authType,
        configJson: parseJsonString(parsed.configJson, {}),
        webhookSecret: parsed.webhookSecret,
        status: parsed.status,
      },
      create: {
        tenantId: session.tenant.id,
        providerType: parsed.providerType,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        endpointUrl: parsed.endpointUrl,
        authType: parsed.authType,
        configJson: parseJsonString(parsed.configJson, {}),
        webhookSecret: parsed.webhookSecret,
        status: parsed.status,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Integration endpoint saved successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to save the integration endpoint."));
  }
}

export async function createDocumentFolderAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "documents"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "DOCUMENT_VAULT", "add");
    const parsed = createDocumentFolderSchema.parse(rawData);

    await prisma.documentFolder.create({
      data: {
        tenantId: session.tenant.id,
        parentId: parsed.parentId,
        name: parsed.name,
        slug: parsed.slug,
        scope: parsed.scope,
        branchId: parsed.branchId,
        employeeId: parsed.employeeId,
        createdById: session.user.id,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Document folder created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to create the document folder."));
  }
}

export async function uploadVaultDocumentAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, buildModulePath(tenantSlug, "documents"));

  try {
    const session = await requireTenantModulePermission(tenantSlug, "DOCUMENT_VAULT", "add");
    const parsed = uploadVaultDocumentSchema.parse(rawData);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirectWithMessage(redirectTo, "error", "Please choose a document to upload.");
    }

    const uploaded = await saveUploadedFile(file, [session.tenant.id, "vault", parsed.folderId], {
      kind: "document",
    });

    if (!uploaded) {
      redirectWithMessage(redirectTo, "error", "Unable to save the document.");
    }

    await prisma.fileAsset.create({
      data: {
        tenantId: session.tenant.id,
        ownerType: "DOCUMENT",
        ownerId: parsed.folderId,
        category: parsed.category,
        originalName: uploaded.originalName,
        fileUrl: uploaded.fileUrl,
        filePath: uploaded.filePath,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        uploadedById: session.user.id,
      },
    });

    await prisma.documentVaultRecord.create({
      data: {
        tenantId: session.tenant.id,
        folderId: parsed.folderId,
        branchId: parsed.branchId,
        employeeId: parsed.employeeId,
        category: parsed.category,
        title: parsed.title,
        description: parsed.description,
        fileUrl: uploaded.fileUrl,
        filePath: uploaded.filePath,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        expiresAt: parseOptionalDate(parsed.expiresAt),
        visibility: parsed.visibility,
        uploadedById: session.user.id,
      },
    });

    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Document uploaded successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(redirectTo, "error", getActionErrorMessage(error, "Unable to upload the document."));
  }
}
