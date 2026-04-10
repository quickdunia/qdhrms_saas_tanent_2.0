import { addDays } from "date-fns";

import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { PhaseTwoModuleDefinition } from "@/lib/modules/registry";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "brand";

export type WorkspaceMetric = {
  label: string;
  value: number | string;
  description: string;
};

export type WorkspaceInsight = {
  title: string;
  value: string;
  detail: string;
};

export type WorkspaceField = {
  label: string;
  value: string;
};

export type WorkspaceRow = {
  id: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
  badge?: {
    label: string;
    variant: BadgeVariant;
  };
  fields: WorkspaceField[];
};

export type PhaseTwoWorkspace = {
  metrics: WorkspaceMetric[];
  insights: WorkspaceInsight[];
  rows: WorkspaceRow[];
  exportRows: Array<Record<string, string | number | null>>;
  statusOptions: string[];
  page: number;
  totalPages: number;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
};

export type PhaseTwoReferences = {
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; label: string }>;
  users: Array<{ id: string; label: string }>;
  jobOpenings: Array<{ id: string; label: string }>;
  candidates: Array<{ id: string; label: string }>;
  assetCategories: Array<{ id: string; label: string }>;
  forms: Array<{ id: string; label: string }>;
  programs: Array<{ id: string; label: string }>;
  folders: Array<{ id: string; label: string }>;
};

function resolveBadgeVariant(status: string): BadgeVariant {
  if (["ACTIVE", "OPEN", "COMPLETED", "HIRED", "RESOLVED", "DONE"].includes(status)) {
    return "success";
  }

  if (["PENDING", "DRAFT", "IN_PROGRESS", "PLANNED", "NOMINATED", "REQUESTED"].includes(status)) {
    return "warning";
  }

  if (["ESCALATED", "ERROR", "LOST", "DAMAGED", "REJECTED", "CANCELED"].includes(status)) {
    return "danger";
  }

  return "brand";
}

export async function getPhaseTwoReferenceData(tenantId: string): Promise<PhaseTwoReferences> {
  const [branches, departments, employees, users, jobOpenings, candidates, assetCategories, forms, programs, folders] =
    await Promise.all([
      prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.department.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.employee.findMany({
        where: { tenantId },
        orderBy: { firstName: "asc" },
        take: 300,
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      }),
      prisma.user.findMany({
        where: { tenantId },
        orderBy: { firstName: "asc" },
        take: 300,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.jobOpening.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, code: true } }),
      prisma.candidate.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.assetCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
      prisma.dynamicForm.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, code: true } }),
      prisma.trainingProgram.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, code: true } }),
      prisma.documentFolder.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    ]);

  return {
    branches,
    departments,
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${[employee.firstName, employee.lastName].filter(Boolean).join(" ")} (${employee.employeeCode})`,
    })),
    users: users.map((user) => ({
      id: user.id,
      label: `${[user.firstName, user.lastName].filter(Boolean).join(" ")} - ${user.email}`,
    })),
    jobOpenings: jobOpenings.map((jobOpening) => ({
      id: jobOpening.id,
      label: `${jobOpening.title} (${jobOpening.code})`,
    })),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      label: `${[candidate.firstName, candidate.lastName].filter(Boolean).join(" ")} - ${candidate.email}`,
    })),
    assetCategories: assetCategories.map((category) => ({
      id: category.id,
      label: `${category.name} (${category.code})`,
    })),
    forms: forms.map((form) => ({
      id: form.id,
      label: `${form.title} (${form.code})`,
    })),
    programs: programs.map((program) => ({
      id: program.id,
      label: `${program.title} (${program.code})`,
    })),
    folders: folders.map((folder) => ({
      id: folder.id,
      label: `${folder.name} (${folder.slug})`,
    })),
  };
}

export async function getPhaseTwoModuleWorkspace(input: {
  tenantId: string;
  module: PhaseTwoModuleDefinition;
  search?: string;
  status?: string;
  page?: string;
  pageSize?: number;
}): Promise<PhaseTwoWorkspace> {
  const { page, take, skip } = getPaginationParams(input.page, input.pageSize ?? 8);
  const search = input.search?.trim();
  const status = input.status?.trim().toUpperCase();

  switch (input.module.key) {
    case "RECRUITMENT":
      return getRecruitmentWorkspace(input.tenantId, { search, status, page, take, skip });
    case "ONBOARDING":
      return getOnboardingWorkspace(input.tenantId, { search, status, page, take, skip });
    case "OFFBOARDING":
      return getOffboardingWorkspace(input.tenantId, { search, status, page, take, skip });
    case "ASSET_MANAGEMENT":
      return getAssetWorkspace(input.tenantId, { search, status, page, take, skip });
    case "HELPDESK":
      return getHelpdeskWorkspace(input.tenantId, { search, status, page, take, skip });
    case "DYNAMIC_FORMS":
      return getDynamicFormsWorkspace(input.tenantId, { search, status, page, take, skip });
    case "PERFORMANCE":
      return getPerformanceWorkspace(input.tenantId, { search, status, page, take, skip });
    case "TRAINING":
      return getTrainingWorkspace(input.tenantId, { search, status, page, take, skip });
    case "WORKFLOWS":
      return getWorkflowWorkspace(input.tenantId, { search, status, page, take, skip });
    case "INTEGRATIONS":
      return getIntegrationWorkspace(input.tenantId, { search, status, page, take, skip });
    case "DOCUMENT_VAULT":
      return getDocumentWorkspace(input.tenantId, { search, status, page, take, skip });
    case "ADVANCED_ANALYTICS":
      return getAnalyticsWorkspace(input.tenantId);
    default:
      return getAnalyticsWorkspace(input.tenantId);
  }
}

async function getRecruitmentWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { stage: pager.status as never } : {}),
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
  const [openJobs, totalCandidates, shortlisted, scheduledInterviews, totalRows, candidates] = await Promise.all([
    prisma.jobOpening.count({ where: { tenantId, status: "OPEN" } }),
    prisma.candidate.count({ where: { tenantId } }),
    prisma.candidate.count({ where: { tenantId, stage: { in: ["SHORTLISTED", "INTERVIEW", "OFFERED"] } } }),
    prisma.interviewSchedule.count({ where: { tenantId, scheduledAt: { gte: new Date() } } }),
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      include: {
        jobOpening: {
          select: {
            title: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Open jobs", value: openJobs, description: "Active requisitions across departments." },
      { label: "Candidates", value: totalCandidates, description: "Profiles currently stored in the funnel." },
      { label: "Shortlisted", value: shortlisted, description: "Pipeline-ready candidates with momentum." },
      { label: "Upcoming interviews", value: scheduledInterviews, description: "Scheduled interview slots from now onward." },
    ],
    insights: [
      { title: "Hiring velocity", value: `${shortlisted}`, detail: "Candidates are in shortlist or interview stages." },
      { title: "Open requisitions", value: `${openJobs}`, detail: "Active vacancies still available for sourcing." },
    ],
    rows: candidates.map((candidate) => ({
      id: candidate.id,
      title: [candidate.firstName, candidate.lastName].filter(Boolean).join(" "),
      subtitle: candidate.email,
      badge: {
        label: candidate.stage.replaceAll("_", " "),
        variant: resolveBadgeVariant(candidate.stage),
      },
      fields: [
        { label: "Job opening", value: `${candidate.jobOpening.title} (${candidate.jobOpening.code})` },
        { label: "Source", value: candidate.source ?? "Direct" },
        { label: "Experience", value: `${candidate.experienceYears} yrs` },
        { label: "Created", value: formatDate(candidate.createdAt) },
      ],
    })),
    exportRows: candidates.map((candidate) => ({
      Candidate: [candidate.firstName, candidate.lastName].filter(Boolean).join(" "),
      Email: candidate.email,
      Stage: candidate.stage.replaceAll("_", " "),
      JobOpening: candidate.jobOpening.code,
      Source: candidate.source ?? "Direct",
      ExperienceYears: candidate.experienceYears,
      CreatedAt: formatDateTime(candidate.createdAt),
    })),
    statusOptions: ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search candidate, email, or sourcing source",
    emptyTitle: "No candidates in pipeline",
    emptyDescription: "Create a job opening and add the first candidate to start the hiring funnel.",
  };
}

async function getOnboardingWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { onboardingCode: { contains: pager.search } } : {}),
  };
  const [totalPlans, activePlans, completedPlans, probationDue, totalRows, plans] = await Promise.all([
    prisma.onboardingPlan.count({ where: { tenantId } }),
    prisma.onboardingPlan.count({ where: { tenantId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.onboardingPlan.count({ where: { tenantId, status: "COMPLETED" } }),
    prisma.onboardingPlan.count({
      where: {
        tenantId,
        probationEndAt: {
          lte: addDays(new Date(), 30),
          gte: new Date(),
        },
      },
    }),
    prisma.onboardingPlan.count({ where }),
    prisma.onboardingPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  const employeeMap = new Map(
    (
      await prisma.employee.findMany({
        where: {
          tenantId,
          id: { in: plans.map((plan) => plan.employeeId).filter((value): value is string => Boolean(value)) },
        },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      })
    ).map((employee) => [employee.id, `${[employee.firstName, employee.lastName].filter(Boolean).join(" ")} (${employee.employeeCode})`]),
  );

  return {
    metrics: [
      { label: "Onboarding plans", value: totalPlans, description: "Employee onboarding plans across the tenant." },
      { label: "Active plans", value: activePlans, description: "Plans still in progress or waiting completion." },
      { label: "Completed", value: completedPlans, description: "Successfully completed onboarding journeys." },
      { label: "Probation due", value: probationDue, description: "Employees approaching probation review windows." },
    ],
    insights: [
      { title: "Conversion readiness", value: `${activePlans}`, detail: "Employees with open onboarding actions." },
      { title: "Probation watchlist", value: `${probationDue}`, detail: "Plans with probation end dates in the next 30 days." },
    ],
    rows: plans.map((plan) => ({
      id: plan.id,
      title: employeeMap.get(plan.employeeId ?? "") ?? plan.onboardingCode,
      subtitle: plan.onboardingCode,
      badge: { label: plan.status.replaceAll("_", " "), variant: resolveBadgeVariant(plan.status) },
      fields: [
        { label: "Joining date", value: formatDate(plan.joiningDate) },
        { label: "Assigned role", value: plan.assignedRole?.replaceAll("_", " ") ?? "Employee" },
        { label: "Probation ends", value: formatDate(plan.probationEndAt) },
        { label: "First login", value: formatDateTime(plan.firstLoginReadyAt) },
      ],
    })),
    exportRows: plans.map((plan) => ({
      OnboardingCode: plan.onboardingCode,
      Employee: employeeMap.get(plan.employeeId ?? "") ?? "",
      Status: plan.status.replaceAll("_", " "),
      JoiningDate: formatDate(plan.joiningDate),
      ProbationEnd: formatDate(plan.probationEndAt),
      AssignedRole: plan.assignedRole?.replaceAll("_", " ") ?? "Employee",
    })),
    statusOptions: ["PENDING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search onboarding code or employee journey",
    emptyTitle: "No onboarding plans yet",
    emptyDescription: "Create an onboarding plan to manage documents, policies, access, and probation milestones.",
  };
}

async function getOffboardingWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { exitCode: { contains: pager.search } } : {}),
  };
  const [requested, inFlight, completed, pendingSettlements, totalRows, requests] = await Promise.all([
    prisma.offboardingRequest.count({ where: { tenantId, status: "REQUESTED" } }),
    prisma.offboardingRequest.count({ where: { tenantId, status: { in: ["NOTICE_PERIOD", "MANAGER_REVIEW", "HR_REVIEW", "SETTLEMENT"] } } }),
    prisma.offboardingRequest.count({ where: { tenantId, status: "COMPLETED" } }),
    prisma.offboardingRequest.count({ where: { tenantId, settlementStatus: "PENDING" } }),
    prisma.offboardingRequest.count({ where }),
    prisma.offboardingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  const employeeMap = new Map(
    (
      await prisma.employee.findMany({
        where: {
          tenantId,
          id: { in: requests.map((request) => request.employeeId) },
        },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      })
    ).map((employee) => [employee.id, `${[employee.firstName, employee.lastName].filter(Boolean).join(" ")} (${employee.employeeCode})`]),
  );

  return {
    metrics: [
      { label: "New requests", value: requested, description: "Fresh resignation or exit requests waiting action." },
      { label: "In flight", value: inFlight, description: "Requests moving through approval, notice, or settlement." },
      { label: "Completed exits", value: completed, description: "Offboarding requests fully completed." },
      { label: "Pending settlement", value: pendingSettlements, description: "Exit cases still awaiting final settlement." },
    ],
    insights: [
      { title: "Open exit cases", value: `${inFlight}`, detail: "Monitor approvals, assets, and notice completion." },
      { title: "Settlement queue", value: `${pendingSettlements}`, detail: "Offboarding records with finance action pending." },
    ],
    rows: requests.map((request) => ({
      id: request.id,
      title: employeeMap.get(request.employeeId) ?? request.exitCode,
      subtitle: request.exitCode,
      badge: { label: request.status.replaceAll("_", " "), variant: resolveBadgeVariant(request.status) },
      fields: [
        { label: "Type", value: request.type.replaceAll("_", " ") },
        { label: "Notice end", value: formatDate(request.noticeEndAt) },
        { label: "Last working day", value: formatDate(request.lastWorkingDay) },
        { label: "Settlement", value: request.settlementStatus.replaceAll("_", " ") },
      ],
    })),
    exportRows: requests.map((request) => ({
      ExitCode: request.exitCode,
      Employee: employeeMap.get(request.employeeId) ?? "",
      Type: request.type.replaceAll("_", " "),
      Status: request.status.replaceAll("_", " "),
      NoticeEnd: formatDate(request.noticeEndAt),
      LastWorkingDay: formatDate(request.lastWorkingDay),
      Settlement: request.settlementStatus.replaceAll("_", " "),
    })),
    statusOptions: ["REQUESTED", "NOTICE_PERIOD", "MANAGER_REVIEW", "HR_REVIEW", "SETTLEMENT", "COMPLETED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search exit code or offboarding queue",
    emptyTitle: "No offboarding cases yet",
    emptyDescription: "Exit requests will appear here with notice tracking, settlement state, and document readiness.",
  };
}

async function getAssetWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { condition: pager.status as never } : {}),
    ...(pager.search ? { OR: [{ name: { contains: pager.search } }, { assetCode: { contains: pager.search } }] } : {}),
  };
  const [inventory, assigned, warrantyDue, damagedOrLost, totalRows, assets] = await Promise.all([
    prisma.asset.count({ where: { tenantId } }),
    prisma.assetAssignment.count({ where: { tenantId, status: "ISSUED" } }),
    prisma.asset.count({ where: { tenantId, warrantyExpiry: { lte: addDays(new Date(), 45), gte: new Date() } } }),
    prisma.asset.count({ where: { tenantId, condition: { in: ["DAMAGED", "LOST"] } } }),
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Inventory", value: inventory, description: "Asset records available across branches." },
      { label: "Issued assets", value: assigned, description: "Assets currently allocated to employees." },
      { label: "Warranty due", value: warrantyDue, description: "Assets with warranty ending in the next 45 days." },
      { label: "Damaged or lost", value: damagedOrLost, description: "Assets needing follow-up or replacement." },
    ],
    insights: [
      { title: "Lifecycle watch", value: `${warrantyDue}`, detail: "Warranty or AMC review items nearing expiry." },
      { title: "Risk status", value: `${damagedOrLost}`, detail: "Damaged and lost assets requiring investigation." },
    ],
    rows: assets.map((asset) => ({
      id: asset.id,
      title: `${asset.name} (${asset.assetCode})`,
      subtitle: asset.category.name,
      badge: { label: asset.condition.replaceAll("_", " "), variant: resolveBadgeVariant(asset.condition) },
      fields: [
        { label: "Category", value: `${asset.category.name} (${asset.category.code})` },
        { label: "Branch", value: asset.branchId ?? "-" },
        { label: "Warranty", value: formatDate(asset.warrantyExpiry) },
        { label: "AMC", value: formatDate(asset.amcExpiry) },
      ],
    })),
    exportRows: assets.map((asset) => ({
      AssetCode: asset.assetCode,
      Name: asset.name,
      Category: asset.category.name,
      Condition: asset.condition.replaceAll("_", " "),
      WarrantyExpiry: formatDate(asset.warrantyExpiry),
      AMCExpiry: formatDate(asset.amcExpiry),
    })),
    statusOptions: ["NEW", "GOOD", "DAMAGED", "LOST", "RETIRED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search asset name or asset code",
    emptyTitle: "No asset records yet",
    emptyDescription: "Create categories and register assets to track allocation, warranty, and recovery.",
  };
}

async function getHelpdeskWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search
      ? { OR: [{ ticketNumber: { contains: pager.search } }, { subject: { contains: pager.search } }] }
      : {}),
  };
  const [open, escalated, resolved, urgent, totalRows, tickets] = await Promise.all([
    prisma.helpdeskTicket.count({ where: { tenantId, status: "OPEN" } }),
    prisma.helpdeskTicket.count({ where: { tenantId, status: "ESCALATED" } }),
    prisma.helpdeskTicket.count({ where: { tenantId, status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.helpdeskTicket.count({ where: { tenantId, priority: "URGENT" } }),
    prisma.helpdeskTicket.count({ where }),
    prisma.helpdeskTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Open tickets", value: open, description: "Tickets awaiting first response or investigation." },
      { label: "Escalated", value: escalated, description: "Cases that crossed SLA or required escalation." },
      { label: "Resolved", value: resolved, description: "Tickets resolved or formally closed." },
      { label: "Urgent", value: urgent, description: "High-priority grievances that need close attention." },
    ],
    insights: [
      { title: "Service load", value: `${open}`, detail: "Current open ticket demand in the workspace." },
      { title: "Escalation pressure", value: `${escalated}`, detail: "Cases needing management visibility or intervention." },
    ],
    rows: tickets.map((ticket) => ({
      id: ticket.id,
      title: `${ticket.ticketNumber} - ${ticket.subject}`,
      subtitle: ticket.category,
      badge: { label: ticket.status.replaceAll("_", " "), variant: resolveBadgeVariant(ticket.status) },
      fields: [
        { label: "Priority", value: ticket.priority },
        { label: "Assigned", value: ticket.assignedToId ?? "Unassigned" },
        { label: "Created", value: formatDateTime(ticket.createdAt) },
        { label: "Resolved", value: formatDateTime(ticket.resolvedAt) },
      ],
    })),
    exportRows: tickets.map((ticket) => ({
      Ticket: ticket.ticketNumber,
      Category: ticket.category,
      Subject: ticket.subject,
      Priority: ticket.priority,
      Status: ticket.status.replaceAll("_", " "),
      CreatedAt: formatDateTime(ticket.createdAt),
      ResolvedAt: formatDateTime(ticket.resolvedAt),
    })),
    statusOptions: ["OPEN", "IN_PROGRESS", "WAITING_RESOLUTION", "ESCALATED", "RESOLVED", "CLOSED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search ticket number or subject",
    emptyTitle: "No helpdesk tickets yet",
    emptyDescription: "Employee grievances, complaints, and service issues will appear here once raised.",
  };
}

async function getDynamicFormsWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { isActive: pager.status === "ACTIVE" } : {}),
    ...(pager.search ? { OR: [{ title: { contains: pager.search } }, { code: { contains: pager.search } }] } : {}),
  };
  const [formsCount, activeForms, responses, attachments, totalRows, forms] = await Promise.all([
    prisma.dynamicForm.count({ where: { tenantId } }),
    prisma.dynamicForm.count({ where: { tenantId, isActive: true } }),
    prisma.dynamicFormResponse.count({ where: { tenantId, status: "SUBMITTED" } }),
    prisma.fileAsset.count({ where: { tenantId, ownerType: "FORM_RESPONSE" } }),
    prisma.dynamicForm.count({ where }),
    prisma.dynamicForm.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
      include: {
        assignments: true,
        _count: {
          select: {
            responses: true,
          },
        },
        responses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  return {
    metrics: [
      { label: "Forms", value: formsCount, description: "Custom forms currently configured." },
      { label: "Active forms", value: activeForms, description: "Forms available for response collection." },
      { label: "Responses", value: responses, description: "Submitted responses stored securely." },
      { label: "Attachments", value: attachments, description: "Documents uploaded alongside form responses." },
    ],
    insights: [
      { title: "Response pipeline", value: `${responses}`, detail: "Submitted entries ready for export or review." },
      { title: "Availability", value: `${activeForms}`, detail: "Forms currently exposed to employees." },
    ],
    rows: forms.map((form) => ({
      id: form.id,
      title: `${form.title} (${form.code})`,
      subtitle: `${form.assignments.length} assignment target(s)`,
      badge: { label: form.isActive ? "ACTIVE" : "INACTIVE", variant: form.isActive ? "success" : "neutral" },
      fields: [
        { label: "Assignments", value: `${form.assignments.length}` },
        { label: "Responses", value: `${form._count.responses}` },
        { label: "Latest response", value: formatDateTime(form.responses[0]?.createdAt) },
        { label: "Drafts", value: form.allowDrafts ? "Allowed" : "Locked" },
      ],
    })),
    exportRows: forms.map((form) => ({
      Code: form.code,
      Title: form.title,
      Active: form.isActive ? "Yes" : "No",
      AllowDrafts: form.allowDrafts ? "Yes" : "No",
      Assignments: form.assignments.length,
      Responses: form._count.responses,
      LatestResponse: formatDateTime(form.responses[0]?.createdAt),
    })),
    statusOptions: ["ACTIVE", "INACTIVE"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search form title or code",
    emptyTitle: "No custom forms yet",
    emptyDescription: "Build the first dynamic form to start collecting structured employee responses.",
  };
}

async function getPerformanceWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const cycleWhere = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { OR: [{ name: { contains: pager.search } }, { code: { contains: pager.search } }] } : {}),
  };
  const [kpis, cycles, activeCycles, reviews, recommendations, totalRows, appraisalCycles] = await Promise.all([
    prisma.performanceKpi.count({ where: { tenantId } }),
    prisma.appraisalCycle.count({ where: { tenantId } }),
    prisma.appraisalCycle.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.appraisalReview.count({ where: { tenantId } }),
    prisma.appraisalReview.count({ where: { tenantId, OR: [{ promotionRecommended: true }, { incrementRecommended: true }] } }),
    prisma.appraisalCycle.count({ where: cycleWhere }),
    prisma.appraisalCycle.findMany({ where: cycleWhere, orderBy: { startDate: "desc" }, take: pager.take, skip: pager.skip }),
  ]);

  return {
    metrics: [
      { label: "KPI library", value: kpis, description: "KPIs configured across functions and roles." },
      { label: "Appraisal cycles", value: cycles, description: "Cycles available in the performance calendar." },
      { label: "Active cycles", value: activeCycles, description: "Cycles currently open for review activity." },
      { label: "Recommendations", value: recommendations, description: "Promotion or increment flags raised in reviews." },
    ],
    insights: [
      { title: "Review volume", value: `${reviews}`, detail: "Appraisal reviews recorded across cycles." },
      { title: "Talent moves", value: `${recommendations}`, detail: "Promotion or increment recommendations currently surfaced." },
    ],
    rows: appraisalCycles.map((cycle) => ({
      id: cycle.id,
      title: `${cycle.name} (${cycle.code})`,
      badge: { label: cycle.status.replaceAll("_", " "), variant: resolveBadgeVariant(cycle.status) },
      fields: [
        { label: "Start", value: formatDate(cycle.startDate) },
        { label: "End", value: formatDate(cycle.endDate) },
        { label: "Created", value: formatDate(cycle.createdAt) },
      ],
    })),
    exportRows: appraisalCycles.map((cycle) => ({
      Code: cycle.code,
      Name: cycle.name,
      Status: cycle.status.replaceAll("_", " "),
      StartDate: formatDate(cycle.startDate),
      EndDate: formatDate(cycle.endDate),
    })),
    statusOptions: ["DRAFT", "ACTIVE", "REVIEW_CALIBRATION", "CLOSED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search cycle name or code",
    emptyTitle: "No appraisal cycles yet",
    emptyDescription: "Define KPIs and launch a review cycle to track performance, recommendations, and history.",
  };
}

async function getTrainingWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { OR: [{ title: { contains: pager.search } }, { code: { contains: pager.search } }] } : {}),
  };
  const [programs, activePrograms, nominations, mandatoryPrograms, totalRows, trainingPrograms] = await Promise.all([
    prisma.trainingProgram.count({ where: { tenantId } }),
    prisma.trainingProgram.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.trainingNomination.count({ where: { tenantId } }),
    prisma.trainingProgram.count({ where: { tenantId, mandatory: true } }),
    prisma.trainingProgram.count({ where }),
    prisma.trainingProgram.findMany({
      where,
      include: { nominations: true },
      orderBy: { startsAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Programs", value: programs, description: "Training programs configured in the calendar." },
      { label: "Active programs", value: activePrograms, description: "Programs open or in progress right now." },
      { label: "Nominations", value: nominations, description: "Employee nominations captured across sessions." },
      { label: "Mandatory", value: mandatoryPrograms, description: "Programs marked mandatory for compliance." },
    ],
    insights: [
      { title: "Training demand", value: `${nominations}`, detail: "Employee nominations requiring coordination." },
      { title: "Compliance base", value: `${mandatoryPrograms}`, detail: "Mandatory sessions that support compliance tracking." },
    ],
    rows: trainingPrograms.map((program) => ({
      id: program.id,
      title: `${program.title} (${program.code})`,
      badge: { label: program.status.replaceAll("_", " "), variant: resolveBadgeVariant(program.status) },
      fields: [
        { label: "Schedule", value: `${formatDate(program.startsAt)} to ${formatDate(program.endsAt)}` },
        { label: "Trainer", value: program.trainerName ?? "Internal" },
        { label: "Nominations", value: `${program.nominations.length}` },
        { label: "Mandatory", value: program.mandatory ? "Yes" : "No" },
      ],
    })),
    exportRows: trainingPrograms.map((program) => ({
      Code: program.code,
      Title: program.title,
      Status: program.status.replaceAll("_", " "),
      StartsAt: formatDateTime(program.startsAt),
      EndsAt: formatDateTime(program.endsAt),
      Nominations: program.nominations.length,
      Mandatory: program.mandatory ? "Yes" : "No",
    })),
    statusOptions: ["PLANNED", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search training title or code",
    emptyTitle: "No training programs yet",
    emptyDescription: "Create a training calendar entry to track nominations, attendance, certificates, and compliance.",
  };
}

async function getWorkflowWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { title: { contains: pager.search } } : {}),
  };
  const [todo, inProgress, overdue, completed, totalRows, tasks] = await Promise.all([
    prisma.internalTask.count({ where: { tenantId, status: "TODO" } }),
    prisma.internalTask.count({ where: { tenantId, status: "IN_PROGRESS" } }),
    prisma.internalTask.count({ where: { tenantId, dueAt: { lt: new Date() }, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
    prisma.internalTask.count({ where: { tenantId, status: "DONE" } }),
    prisma.internalTask.count({ where }),
    prisma.internalTask.findMany({ where, orderBy: { createdAt: "desc" }, take: pager.take, skip: pager.skip }),
  ]);

  return {
    metrics: [
      { label: "To do", value: todo, description: "Tasks waiting to be picked up." },
      { label: "In progress", value: inProgress, description: "Workflows currently underway." },
      { label: "Overdue", value: overdue, description: "Tasks that missed their due date." },
      { label: "Completed", value: completed, description: "Tasks already closed out." },
    ],
    insights: [
      { title: "Delivery pressure", value: `${overdue}`, detail: "Tasks that require SLA recovery or follow-up." },
      { title: "Current focus", value: `${inProgress}`, detail: "Items actively being worked by the team." },
    ],
    rows: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.workflowLane ?? "General queue",
      badge: { label: task.status.replaceAll("_", " "), variant: resolveBadgeVariant(task.status) },
      fields: [
        { label: "Priority", value: task.priority },
        { label: "Assigned", value: task.assignedToId ?? "Unassigned" },
        { label: "Due", value: formatDateTime(task.dueAt) },
        { label: "Reminder", value: formatDateTime(task.reminderAt) },
      ],
    })),
    exportRows: tasks.map((task) => ({
      Title: task.title,
      Lane: task.workflowLane ?? "General queue",
      Priority: task.priority,
      Status: task.status.replaceAll("_", " "),
      DueAt: formatDateTime(task.dueAt),
      ReminderAt: formatDateTime(task.reminderAt),
    })),
    statusOptions: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search workflow task title",
    emptyTitle: "No workflow tasks yet",
    emptyDescription: "Create internal process tasks to coordinate HR work across teams and lanes.",
  };
}

async function getIntegrationWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { status: pager.status as never } : {}),
    ...(pager.search ? { OR: [{ name: { contains: pager.search } }, { code: { contains: pager.search } }] } : {}),
  };
  const [endpoints, active, errors, recentEvents, totalRows, integrationEndpoints] = await Promise.all([
    prisma.integrationEndpoint.count({ where: { tenantId } }),
    prisma.integrationEndpoint.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.integrationEndpoint.count({ where: { tenantId, status: "ERROR" } }),
    prisma.integrationEvent.count({ where: { tenantId, createdAt: { gte: addDays(new Date(), -7) } } }),
    prisma.integrationEndpoint.count({ where }),
    prisma.integrationEndpoint.findMany({ where, orderBy: { createdAt: "desc" }, take: pager.take, skip: pager.skip }),
  ]);

  return {
    metrics: [
      { label: "Endpoints", value: endpoints, description: "Configured integration endpoints and connectors." },
      { label: "Active", value: active, description: "Endpoints currently marked active for synchronization." },
      { label: "Errors", value: errors, description: "Connectors currently flagged with an error state." },
      { label: "Events (7d)", value: recentEvents, description: "Integration events observed in the last week." },
    ],
    insights: [
      { title: "Connector health", value: `${active}`, detail: "Active integration-ready services available for rollout." },
      { title: "Exceptions", value: `${errors}`, detail: "Endpoints that may need credential or payload review." },
    ],
    rows: integrationEndpoints.map((endpoint) => ({
      id: endpoint.id,
      title: `${endpoint.name} (${endpoint.code})`,
      subtitle: endpoint.providerType.replaceAll("_", " "),
      badge: { label: endpoint.status.replaceAll("_", " "), variant: resolveBadgeVariant(endpoint.status) },
      fields: [
        { label: "Auth", value: endpoint.authType ?? "Not set" },
        { label: "Endpoint", value: endpoint.endpointUrl ?? "-" },
        { label: "Last sync", value: formatDateTime(endpoint.lastSyncedAt) },
      ],
    })),
    exportRows: integrationEndpoints.map((endpoint) => ({
      Code: endpoint.code,
      Name: endpoint.name,
      Provider: endpoint.providerType.replaceAll("_", " "),
      Status: endpoint.status.replaceAll("_", " "),
      EndpointUrl: endpoint.endpointUrl ?? "",
      LastSyncedAt: formatDateTime(endpoint.lastSyncedAt),
    })),
    statusOptions: ["CONFIGURED", "ACTIVE", "PAUSED", "ERROR"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search integration name or code",
    emptyTitle: "No integration endpoints yet",
    emptyDescription: "Configure connectors for biometric devices, ERP, payment, SMS, or WhatsApp integrations.",
  };
}

async function getDocumentWorkspace(tenantId: string, pager: { search?: string; status?: string; page: number; take: number; skip: number }): Promise<PhaseTwoWorkspace> {
  const where = {
    tenantId,
    ...(pager.status ? { visibility: pager.status as never } : {}),
    ...(pager.search ? { OR: [{ title: { contains: pager.search } }, { category: { contains: pager.search } }] } : {}),
  };
  const [folders, documents, expiringSoon, employeeScoped, totalRows, vaultRecords] = await Promise.all([
    prisma.documentFolder.count({ where: { tenantId } }),
    prisma.documentVaultRecord.count({ where: { tenantId } }),
    prisma.documentVaultRecord.count({ where: { tenantId, expiresAt: { lte: addDays(new Date(), 30), gte: new Date() } } }),
    prisma.documentVaultRecord.count({ where: { tenantId, employeeId: { not: null } } }),
    prisma.documentVaultRecord.count({ where }),
    prisma.documentVaultRecord.findMany({
      where,
      include: {
        folder: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pager.take,
      skip: pager.skip,
    }),
  ]);

  return {
    metrics: [
      { label: "Folders", value: folders, description: "Structured document vault folders configured." },
      { label: "Documents", value: documents, description: "Files stored in the tenant document vault." },
      { label: "Expiring soon", value: expiringSoon, description: "Documents with expiry dates in the next 30 days." },
      { label: "Employee scoped", value: employeeScoped, description: "Employee-specific document records." },
    ],
    insights: [
      { title: "Expiry watchlist", value: `${expiringSoon}`, detail: "Documents that need renewal or action soon." },
      { title: "Folder coverage", value: `${folders}`, detail: "Current vault folder structure across scopes." },
    ],
    rows: vaultRecords.map((record) => ({
      id: record.id,
      title: record.title,
      subtitle: `${record.folder.name} (${record.folder.slug})`,
      badge: { label: record.visibility.replaceAll("_", " "), variant: resolveBadgeVariant(record.visibility) },
      fields: [
        { label: "Category", value: record.category },
        { label: "Created", value: formatDateTime(record.createdAt) },
        { label: "Expires", value: formatDate(record.expiresAt) },
        { label: "Size", value: `${Math.round(record.size / 1024)} KB` },
      ],
    })),
    exportRows: vaultRecords.map((record) => ({
      Title: record.title,
      Folder: record.folder.name,
      Category: record.category,
      Visibility: record.visibility.replaceAll("_", " "),
      CreatedAt: formatDateTime(record.createdAt),
      ExpiresAt: formatDate(record.expiresAt),
      SizeKb: Math.round(record.size / 1024),
    })),
    statusOptions: ["TENANT", "BRANCH", "EMPLOYEE", "RESTRICTED"],
    page: pager.page,
    totalPages: getTotalPages(totalRows, pager.take),
    searchPlaceholder: "Search document title or category",
    emptyTitle: "No vault documents yet",
    emptyDescription: "Create folders and upload HR documents to activate secure retrieval and expiry monitoring.",
  };
}

async function getAnalyticsWorkspace(tenantId: string): Promise<PhaseTwoWorkspace> {
  const [
    openJobs,
    activeOnboarding,
    openOffboarding,
    openTickets,
    damagedAssets,
    activeCycles,
    activePrograms,
  ] = await Promise.all([
    prisma.jobOpening.count({ where: { tenantId, status: "OPEN" } }),
    prisma.onboardingPlan.count({ where: { tenantId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.offboardingRequest.count({ where: { tenantId, status: { in: ["REQUESTED", "NOTICE_PERIOD", "MANAGER_REVIEW", "HR_REVIEW", "SETTLEMENT"] } } }),
    prisma.helpdeskTicket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] } } }),
    prisma.asset.count({ where: { tenantId, condition: { in: ["DAMAGED", "LOST"] } } }),
    prisma.appraisalCycle.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.trainingProgram.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const rows = [
    { id: "recruitment", title: "Recruitment analytics", subtitle: "Open jobs and candidate momentum", badge: { label: "LIVE", variant: "success" as const }, fields: [{ label: "Open jobs", value: `${openJobs}` }, { label: "Hiring load", value: `${openJobs} active requisitions` }] },
    { id: "onboarding", title: "Onboarding analytics", subtitle: "Joiners and activation health", badge: { label: "LIVE", variant: "brand" as const }, fields: [{ label: "Active onboarding", value: `${activeOnboarding}` }, { label: "Readiness", value: `${activeOnboarding} journeys in flight` }] },
    { id: "offboarding", title: "Attrition analytics", subtitle: "Exit volume and clearance queue", badge: { label: "LIVE", variant: "warning" as const }, fields: [{ label: "Open exits", value: `${openOffboarding}` }, { label: "Attrition load", value: `${openOffboarding} active cases` }] },
    { id: "helpdesk", title: "Helpdesk analytics", subtitle: "Service demand and issue pressure", badge: { label: "LIVE", variant: "danger" as const }, fields: [{ label: "Open tickets", value: `${openTickets}` }, { label: "Service pressure", value: `${openTickets} unresolved tickets` }] },
    { id: "assets", title: "Asset analytics", subtitle: "Inventory exceptions and risk view", badge: { label: "LIVE", variant: "warning" as const }, fields: [{ label: "Damaged or lost", value: `${damagedAssets}` }, { label: "Exception rate", value: `${damagedAssets} flagged assets` }] },
    { id: "performance", title: "Appraisal analytics", subtitle: "Active review cycles and performance movement", badge: { label: "LIVE", variant: "brand" as const }, fields: [{ label: "Active cycles", value: `${activeCycles}` }, { label: "Review load", value: `${activeCycles} cycles underway` }] },
    { id: "training", title: "Training analytics", subtitle: "Compliance and participation view", badge: { label: "LIVE", variant: "success" as const }, fields: [{ label: "Active programs", value: `${activePrograms}` }, { label: "Learning demand", value: `${activePrograms} active sessions` }] },
  ];

  return {
    metrics: [
      { label: "Open jobs", value: openJobs, description: "Current demand in the hiring funnel." },
      { label: "Active onboarding", value: activeOnboarding, description: "Employees currently onboarding." },
      { label: "Open exits", value: openOffboarding, description: "Active exit or attrition cases." },
      { label: "Open tickets", value: openTickets, description: "Outstanding helpdesk volume." },
    ],
    insights: [
      { title: "Operational pulse", value: `${openJobs + activeOnboarding + openTickets}`, detail: "Combined activity across hiring, onboarding, and support." },
      { title: "Risk watch", value: `${damagedAssets + openOffboarding}`, detail: "Risk-heavy items spanning assets and exits." },
    ],
    rows,
    exportRows: rows.map((row) => ({
      Report: row.title,
      Summary: row.subtitle ?? "",
      MetricOne: row.fields[0]?.value ?? "",
      MetricTwo: row.fields[1]?.value ?? "",
    })),
    statusOptions: [],
    page: 1,
    totalPages: 1,
    searchPlaceholder: "Analytics is generated from live tenant data",
    emptyTitle: "Analytics will populate as modules collect data",
    emptyDescription: "Once teams start using recruitment, onboarding, helpdesk, and other modules, cross-module insights will appear here.",
  };
}
