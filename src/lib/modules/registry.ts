import type { ModuleKey } from "@/lib/auth/constants";
import type { NavItem } from "@/components/layout/dashboard-shell";

export type PhaseTwoModuleKey =
  | "RECRUITMENT"
  | "ONBOARDING"
  | "OFFBOARDING"
  | "ASSET_MANAGEMENT"
  | "HELPDESK"
  | "DYNAMIC_FORMS"
  | "PERFORMANCE"
  | "TRAINING"
  | "WORKFLOWS"
  | "INTEGRATIONS"
  | "DOCUMENT_VAULT"
  | "ADVANCED_ANALYTICS";

export type CoreModuleKey =
  | "SELF_SERVICE"
  | "USERS"
  | "ROLES"
  | "ATTENDANCE"
  | "LEAVE"
  | "PAYROLL"
  | "ANNOUNCEMENTS"
  | "APPROVALS"
  | "NOTIFICATIONS"
  | "IMPORT_EXPORT";

export type PhaseTwoModuleDefinition = {
  key: PhaseTwoModuleKey;
  slug: string;
  label: string;
  description: string;
  icon: NavItem["icon"];
  section: string;
  accent: string;
};

export type CoreModuleDefinition = {
  key: CoreModuleKey;
  slug: string;
  label: string;
  description: string;
  icon: NavItem["icon"];
  section: string;
  accent: string;
};

export type WorkspaceModuleDefinition =
  | ({ kind: "core" } & CoreModuleDefinition)
  | ({ kind: "phase-two" } & PhaseTwoModuleDefinition);

export const CORE_MODULES: CoreModuleDefinition[] = [
  {
    key: "SELF_SERVICE",
    slug: "self-service",
    label: "Self Service",
    description: "Personal attendance, leave, notices, tickets, and day-to-day employee actions.",
    icon: "selfService",
    section: "Core",
    accent: "from-emerald-500/18 via-white to-teal-50",
  },
  {
    key: "USERS",
    slug: "users",
    label: "Users",
    description: "Provision tenant users, secure portal access, and manage account lifecycle.",
    icon: "usersAdmin",
    section: "Administration",
    accent: "from-indigo-500/18 via-white to-indigo-50",
  },
  {
    key: "ROLES",
    slug: "roles",
    label: "Roles & Permissions",
    description: "Tune tenant role permissions and safeguard least-privilege access control.",
    icon: "roles",
    section: "Administration",
    accent: "from-slate-500/18 via-white to-slate-50",
  },
  {
    key: "ATTENDANCE",
    slug: "attendance",
    label: "Attendance",
    description: "Track attendance, corrections, shift coverage, and daily workforce visibility.",
    icon: "attendance",
    section: "People Ops",
    accent: "from-sky-500/18 via-white to-sky-50",
  },
  {
    key: "LEAVE",
    slug: "leave",
    label: "Leave",
    description: "Manage leave types, requests, approvals, holidays, and employee time away.",
    icon: "leave",
    section: "People Ops",
    accent: "from-amber-500/18 via-white to-amber-50",
  },
  {
    key: "PAYROLL",
    slug: "payroll",
    label: "Payroll",
    description: "Run payroll, view salary structures, and generate print-ready payslips.",
    icon: "payroll",
    section: "People Ops",
    accent: "from-rose-500/18 via-white to-rose-50",
  },
  {
    key: "ANNOUNCEMENTS",
    slug: "announcements",
    label: "Announcements",
    description: "Publish notices with audience targeting, priority, and attachments.",
    icon: "announcements",
    section: "Communication",
    accent: "from-fuchsia-500/18 via-white to-fuchsia-50",
  },
  {
    key: "APPROVALS",
    slug: "approvals",
    label: "Approvals",
    description: "Configure workflows and move requests through structured approval queues.",
    icon: "approvals",
    section: "Communication",
    accent: "from-lime-500/18 via-white to-lime-50",
  },
  {
    key: "NOTIFICATIONS",
    slug: "notifications",
    label: "Notifications",
    description: "Deliver in-app and email notifications with operational traceability.",
    icon: "notifications",
    section: "Communication",
    accent: "from-cyan-500/18 via-white to-cyan-50",
  },
  {
    key: "IMPORT_EXPORT",
    slug: "imports",
    label: "Imports",
    description: "Bulk import users and employees with job history, errors, and audit trace.",
    icon: "imports",
    section: "Platform",
    accent: "from-violet-500/18 via-white to-violet-50",
  },
];

export const PHASE_TWO_MODULES: PhaseTwoModuleDefinition[] = [
  {
    key: "RECRUITMENT",
    slug: "recruitment",
    label: "Recruitment",
    description: "Hiring pipeline, candidates, interviews, and employee conversion.",
    icon: "recruitment",
    section: "Talent",
    accent: "from-cyan-500/20 via-white to-cyan-50",
  },
  {
    key: "ONBOARDING",
    slug: "onboarding",
    label: "Onboarding",
    description: "Joining checklists, welcome flows, policy acceptance, and probation setup.",
    icon: "onboarding",
    section: "Talent",
    accent: "from-emerald-500/18 via-white to-emerald-50",
  },
  {
    key: "OFFBOARDING",
    slug: "offboarding",
    label: "Offboarding",
    description: "Resignations, settlements, clearance, letters, and exit reporting.",
    icon: "offboarding",
    section: "Talent",
    accent: "from-amber-500/18 via-white to-amber-50",
  },
  {
    key: "PERFORMANCE",
    slug: "performance",
    label: "Performance",
    description: "KPIs, review cycles, ratings, recommendations, and appraisal history.",
    icon: "performance",
    section: "Talent",
    accent: "from-violet-500/18 via-white to-violet-50",
  },
  {
    key: "TRAINING",
    slug: "training",
    label: "Training",
    description: "Programs, nominations, compliance, attendance, and certificates.",
    icon: "training",
    section: "Talent",
    accent: "from-sky-500/18 via-white to-sky-50",
  },
  {
    key: "ASSET_MANAGEMENT",
    slug: "assets",
    label: "Asset Management",
    description: "Categories, inventory, assignment, return workflow, and warranty tracking.",
    icon: "assets",
    section: "Operations",
    accent: "from-slate-500/18 via-white to-slate-50",
  },
  {
    key: "HELPDESK",
    slug: "helpdesk",
    label: "Helpdesk",
    description: "Employee tickets, grievance handling, escalation, and service history.",
    icon: "helpdesk",
    section: "Operations",
    accent: "from-rose-500/18 via-white to-rose-50",
  },
  {
    key: "DYNAMIC_FORMS",
    slug: "forms",
    label: "Dynamic Forms",
    description: "Builder-driven custom forms, secure responses, and distribution controls.",
    icon: "forms",
    section: "Operations",
    accent: "from-fuchsia-500/18 via-white to-fuchsia-50",
  },
  {
    key: "WORKFLOWS",
    slug: "workflows",
    label: "Internal Workflows",
    description: "Internal HR tasks, reminders, due dates, and process boards.",
    icon: "workflows",
    section: "Operations",
    accent: "from-lime-500/18 via-white to-lime-50",
  },
  {
    key: "DOCUMENT_VAULT",
    slug: "documents",
    label: "Document Vault",
    description: "Structured folders, expiry alerts, secure previews, and governed access.",
    icon: "documents",
    section: "Operations",
    accent: "from-orange-500/18 via-white to-orange-50",
  },
  {
    key: "INTEGRATIONS",
    slug: "integrations",
    label: "Integrations",
    description: "Integration-ready connectors for biometric, ERP, payment, SMS, and WhatsApp flows.",
    icon: "integrations",
    section: "Platform",
    accent: "from-indigo-500/18 via-white to-indigo-50",
  },
  {
    key: "ADVANCED_ANALYTICS",
    slug: "analytics",
    label: "Advanced Analytics",
    description: "Cross-module insights for recruitment, attrition, assets, helpdesk, and performance.",
    icon: "analytics",
    section: "Platform",
    accent: "from-teal-500/18 via-white to-teal-50",
  },
];

export const PHASE_TWO_MODULE_KEYS = PHASE_TWO_MODULES.map((module) => module.key);
export const CORE_MODULE_KEYS = CORE_MODULES.map((module) => module.key);
export const WORKSPACE_MODULES: WorkspaceModuleDefinition[] = [
  ...CORE_MODULES.map((module) => ({ ...module, kind: "core" as const })),
  ...PHASE_TWO_MODULES.map((module) => ({ ...module, kind: "phase-two" as const })),
];

export function isPhaseTwoModuleKey(moduleKey: ModuleKey): moduleKey is PhaseTwoModuleKey {
  return PHASE_TWO_MODULE_KEYS.includes(moduleKey as PhaseTwoModuleKey);
}

export function isCoreModuleKey(moduleKey: ModuleKey): moduleKey is CoreModuleKey {
  return CORE_MODULE_KEYS.includes(moduleKey as CoreModuleKey);
}

export function getPhaseTwoModuleBySlug(slug: string) {
  return PHASE_TWO_MODULES.find((module) => module.slug === slug);
}

export function getPhaseTwoModuleByKey(moduleKey: PhaseTwoModuleKey) {
  return PHASE_TWO_MODULES.find((module) => module.key === moduleKey);
}

export function getCoreModuleBySlug(slug: string) {
  return CORE_MODULES.find((module) => module.slug === slug);
}

export function getCoreModuleByKey(moduleKey: CoreModuleKey) {
  return CORE_MODULES.find((module) => module.key === moduleKey);
}

export function getWorkspaceModuleBySlug(slug: string) {
  return WORKSPACE_MODULES.find((module) => module.slug === slug);
}
