import { Role, type RolePermission } from "@prisma/client";

import type {
  ModuleKey,
  PermissionAction,
} from "@/lib/auth/constants";
import { MODULE_KEYS } from "@/lib/auth/constants";

export type PermissionSet = {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
};

const NONE: PermissionSet = {
  view: false,
  add: false,
  edit: false,
  delete: false,
  approve: false,
  export: false,
};

const VIEW_ONLY: PermissionSet = {
  view: true,
  add: false,
  edit: false,
  delete: false,
  approve: false,
  export: false,
};

const MANAGE: PermissionSet = {
  view: true,
  add: true,
  edit: true,
  delete: true,
  approve: false,
  export: true,
};

const FULL: PermissionSet = {
  view: true,
  add: true,
  edit: true,
  delete: true,
  approve: true,
  export: true,
};

const APPROVAL_MANAGER: PermissionSet = {
  view: true,
  add: true,
  edit: true,
  delete: false,
  approve: true,
  export: true,
};

const OPERATOR: PermissionSet = {
  view: true,
  add: true,
  edit: true,
  delete: false,
  approve: false,
  export: true,
};

function clonePermissionSet(permissionSet: PermissionSet): PermissionSet {
  return { ...permissionSet };
}

function buildPermissionMap(
  overrides: Partial<Record<ModuleKey, PermissionSet>>,
): Record<ModuleKey, PermissionSet> {
  return Object.fromEntries(
    MODULE_KEYS.map((moduleKey) => [moduleKey, clonePermissionSet(overrides[moduleKey] ?? NONE)]),
  ) as Record<ModuleKey, PermissionSet>;
}

const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<ModuleKey, PermissionSet>> = {
  SUPER_ADMIN: buildPermissionMap(
    Object.fromEntries(MODULE_KEYS.map((moduleKey) => [moduleKey, FULL])) as Partial<
      Record<ModuleKey, PermissionSet>
    >,
  ),
  TENANT_ADMIN: buildPermissionMap({
    DASHBOARD: FULL,
    ORGANIZATION: FULL,
    SUBSCRIPTIONS: VIEW_ONLY,
    USERS: FULL,
    ROLES: FULL,
    EMPLOYEES: FULL,
    ATTENDANCE: FULL,
    SHIFTS: FULL,
    SECURITY: FULL,
    HOLIDAYS: FULL,
    ANNOUNCEMENTS: FULL,
    APPROVALS: FULL,
    NOTIFICATIONS: FULL,
    AUDIT_LOGS: VIEW_ONLY,
    SETTINGS: FULL,
    REPORTS: FULL,
    LEAVE: FULL,
    PAYROLL: FULL,
    IMPORT_EXPORT: FULL,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: FULL,
    ONBOARDING: FULL,
    OFFBOARDING: FULL,
    ASSET_MANAGEMENT: FULL,
    HELPDESK: FULL,
    DYNAMIC_FORMS: FULL,
    PERFORMANCE: FULL,
    TRAINING: FULL,
    WORKFLOWS: FULL,
    INTEGRATIONS: FULL,
    DOCUMENT_VAULT: FULL,
    ADVANCED_ANALYTICS: FULL,
  }),
  HR_MANAGER: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    ORGANIZATION: MANAGE,
    USERS: APPROVAL_MANAGER,
    ROLES: VIEW_ONLY,
    EMPLOYEES: FULL,
    ATTENDANCE: FULL,
    SHIFTS: FULL,
    SECURITY: VIEW_ONLY,
    HOLIDAYS: MANAGE,
    ANNOUNCEMENTS: MANAGE,
    APPROVALS: FULL,
    NOTIFICATIONS: MANAGE,
    AUDIT_LOGS: VIEW_ONLY,
    REPORTS: FULL,
    LEAVE: FULL,
    IMPORT_EXPORT: FULL,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: FULL,
    ONBOARDING: FULL,
    OFFBOARDING: FULL,
    ASSET_MANAGEMENT: FULL,
    HELPDESK: FULL,
    DYNAMIC_FORMS: FULL,
    PERFORMANCE: FULL,
    TRAINING: FULL,
    WORKFLOWS: FULL,
    INTEGRATIONS: VIEW_ONLY,
    DOCUMENT_VAULT: FULL,
    ADVANCED_ANALYTICS: FULL,
  }),
  HR_EXECUTIVE: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    ORGANIZATION: VIEW_ONLY,
    USERS: OPERATOR,
    EMPLOYEES: OPERATOR,
    ATTENDANCE: OPERATOR,
    SHIFTS: OPERATOR,
    HOLIDAYS: OPERATOR,
    ANNOUNCEMENTS: OPERATOR,
    APPROVALS: VIEW_ONLY,
    NOTIFICATIONS: OPERATOR,
    REPORTS: VIEW_ONLY,
    LEAVE: OPERATOR,
    IMPORT_EXPORT: OPERATOR,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: OPERATOR,
    ONBOARDING: OPERATOR,
    OFFBOARDING: OPERATOR,
    ASSET_MANAGEMENT: OPERATOR,
    HELPDESK: OPERATOR,
    DYNAMIC_FORMS: OPERATOR,
    PERFORMANCE: VIEW_ONLY,
    TRAINING: OPERATOR,
    WORKFLOWS: OPERATOR,
    INTEGRATIONS: VIEW_ONLY,
    DOCUMENT_VAULT: OPERATOR,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
  ACCOUNTS_MANAGER: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    USERS: VIEW_ONLY,
    EMPLOYEES: VIEW_ONLY,
    REPORTS: FULL,
    PAYROLL: APPROVAL_MANAGER,
    IMPORT_EXPORT: FULL,
    SELF_SERVICE: VIEW_ONLY,
    OFFBOARDING: APPROVAL_MANAGER,
    ASSET_MANAGEMENT: VIEW_ONLY,
    HELPDESK: VIEW_ONLY,
    DOCUMENT_VAULT: VIEW_ONLY,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
  PAYROLL_MANAGER: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    EMPLOYEES: VIEW_ONLY,
    ATTENDANCE: VIEW_ONLY,
    APPROVALS: APPROVAL_MANAGER,
    REPORTS: FULL,
    PAYROLL: FULL,
    IMPORT_EXPORT: FULL,
    NOTIFICATIONS: OPERATOR,
    SELF_SERVICE: VIEW_ONLY,
    OFFBOARDING: VIEW_ONLY,
    DOCUMENT_VAULT: VIEW_ONLY,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
  BRANCH_MANAGER: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    ORGANIZATION: OPERATOR,
    USERS: VIEW_ONLY,
    EMPLOYEES: OPERATOR,
    ATTENDANCE: APPROVAL_MANAGER,
    SHIFTS: OPERATOR,
    HOLIDAYS: OPERATOR,
    ANNOUNCEMENTS: OPERATOR,
    APPROVALS: APPROVAL_MANAGER,
    REPORTS: OPERATOR,
    LEAVE: APPROVAL_MANAGER,
    NOTIFICATIONS: OPERATOR,
    IMPORT_EXPORT: VIEW_ONLY,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: APPROVAL_MANAGER,
    ONBOARDING: APPROVAL_MANAGER,
    OFFBOARDING: APPROVAL_MANAGER,
    ASSET_MANAGEMENT: APPROVAL_MANAGER,
    HELPDESK: APPROVAL_MANAGER,
    DYNAMIC_FORMS: VIEW_ONLY,
    PERFORMANCE: VIEW_ONLY,
    TRAINING: APPROVAL_MANAGER,
    WORKFLOWS: APPROVAL_MANAGER,
    DOCUMENT_VAULT: APPROVAL_MANAGER,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
  DEPARTMENT_HEAD: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    EMPLOYEES: VIEW_ONLY,
    ATTENDANCE: APPROVAL_MANAGER,
    ANNOUNCEMENTS: OPERATOR,
    APPROVALS: APPROVAL_MANAGER,
    REPORTS: VIEW_ONLY,
    LEAVE: APPROVAL_MANAGER,
    NOTIFICATIONS: OPERATOR,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: APPROVAL_MANAGER,
    ONBOARDING: VIEW_ONLY,
    OFFBOARDING: APPROVAL_MANAGER,
    ASSET_MANAGEMENT: VIEW_ONLY,
    HELPDESK: APPROVAL_MANAGER,
    DYNAMIC_FORMS: VIEW_ONLY,
    PERFORMANCE: APPROVAL_MANAGER,
    TRAINING: APPROVAL_MANAGER,
    WORKFLOWS: APPROVAL_MANAGER,
    DOCUMENT_VAULT: VIEW_ONLY,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
  EMPLOYEE: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    ATTENDANCE: VIEW_ONLY,
    ANNOUNCEMENTS: VIEW_ONLY,
    NOTIFICATIONS: VIEW_ONLY,
    LEAVE: { ...VIEW_ONLY, add: true },
    SELF_SERVICE: { ...VIEW_ONLY, add: true, edit: true, export: true },
    ONBOARDING: VIEW_ONLY,
    OFFBOARDING: { ...VIEW_ONLY, add: true, edit: true },
    ASSET_MANAGEMENT: VIEW_ONLY,
    HELPDESK: { ...VIEW_ONLY, add: true, edit: true, export: true },
    DYNAMIC_FORMS: { ...VIEW_ONLY, add: true, edit: true, export: true },
    PERFORMANCE: { ...VIEW_ONLY, add: true, edit: true, export: true },
    TRAINING: VIEW_ONLY,
    WORKFLOWS: VIEW_ONLY,
    DOCUMENT_VAULT: VIEW_ONLY,
  }),
  VIEWER: buildPermissionMap({
    DASHBOARD: VIEW_ONLY,
    ORGANIZATION: VIEW_ONLY,
    USERS: VIEW_ONLY,
    EMPLOYEES: VIEW_ONLY,
    ATTENDANCE: VIEW_ONLY,
    SHIFTS: VIEW_ONLY,
    HOLIDAYS: VIEW_ONLY,
    ANNOUNCEMENTS: VIEW_ONLY,
    APPROVALS: VIEW_ONLY,
    REPORTS: VIEW_ONLY,
    LEAVE: VIEW_ONLY,
    PAYROLL: VIEW_ONLY,
    NOTIFICATIONS: VIEW_ONLY,
    AUDIT_LOGS: VIEW_ONLY,
    SELF_SERVICE: VIEW_ONLY,
    RECRUITMENT: VIEW_ONLY,
    ONBOARDING: VIEW_ONLY,
    OFFBOARDING: VIEW_ONLY,
    ASSET_MANAGEMENT: VIEW_ONLY,
    HELPDESK: VIEW_ONLY,
    DYNAMIC_FORMS: VIEW_ONLY,
    PERFORMANCE: VIEW_ONLY,
    TRAINING: VIEW_ONLY,
    WORKFLOWS: VIEW_ONLY,
    INTEGRATIONS: VIEW_ONLY,
    DOCUMENT_VAULT: VIEW_ONLY,
    ADVANCED_ANALYTICS: VIEW_ONLY,
  }),
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  DASHBOARD: "Dashboard",
  ORGANIZATION: "Organization",
  SUBSCRIPTIONS: "Subscriptions",
  USERS: "Users",
  ROLES: "Roles & Permissions",
  EMPLOYEES: "Employees",
  ATTENDANCE: "Attendance",
  SHIFTS: "Shifts & Rosters",
  SECURITY: "Security",
  HOLIDAYS: "Holidays",
  ANNOUNCEMENTS: "Announcements",
  APPROVALS: "Approvals",
  NOTIFICATIONS: "Notifications",
  AUDIT_LOGS: "Audit Logs",
  SETTINGS: "Settings",
  REPORTS: "Reports",
  LEAVE: "Leave",
  PAYROLL: "Payroll",
  IMPORT_EXPORT: "Import / Export",
  SELF_SERVICE: "Self Service",
  RECRUITMENT: "Recruitment",
  ONBOARDING: "Onboarding",
  OFFBOARDING: "Exit & Offboarding",
  ASSET_MANAGEMENT: "Asset Management",
  HELPDESK: "Helpdesk",
  DYNAMIC_FORMS: "Dynamic Forms",
  PERFORMANCE: "Performance",
  TRAINING: "Training",
  WORKFLOWS: "Internal Workflows",
  INTEGRATIONS: "Integrations",
  DOCUMENT_VAULT: "Document Vault",
  ADVANCED_ANALYTICS: "Advanced Analytics",
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_ADMIN: "Tenant Admin",
  HR_MANAGER: "HR Manager",
  HR_EXECUTIVE: "HR Executive",
  ACCOUNTS_MANAGER: "Accounts Manager",
  PAYROLL_MANAGER: "Payroll Manager",
  BRANCH_MANAGER: "Branch Manager",
  DEPARTMENT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
  VIEWER: "Viewer",
};

export function getDefaultRolePermissions(role: Role) {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? buildPermissionMap({});
}

export function getRoleModules(role: Role) {
  const permissions = getDefaultRolePermissions(role);

  return MODULE_KEYS.filter((moduleKey) => permissions[moduleKey].view);
}

export function normalizeModuleList(value: unknown): ModuleKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ModuleKey => MODULE_KEYS.includes(item as ModuleKey));
}

export function resolveAllowedModules(role: Role, planModules?: unknown, overrides?: unknown) {
  const overrideList = normalizeModuleList(overrides);
  const baseModules = overrideList.length > 0 ? overrideList : normalizeModuleList(planModules);
  const roleModules = getRoleModules(role);

  return baseModules.filter((moduleKey) => roleModules.includes(moduleKey));
}

export function hasModuleAccess(role: Role, enabledModules: ModuleKey[], moduleKey: ModuleKey) {
  if (role === Role.SUPER_ADMIN) {
    return true;
  }

  return enabledModules.includes(moduleKey) && getRoleModules(role).includes(moduleKey);
}

export function resolvePermissionSet(
  role: Role,
  moduleKey: ModuleKey,
  override?: Pick<
    RolePermission,
    "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove" | "canExport"
  > | null,
): PermissionSet {
  const base = getDefaultRolePermissions(role)[moduleKey] ?? NONE;

  if (!override) {
    return base;
  }

  return {
    view: override.canView,
    add: override.canAdd,
    edit: override.canEdit,
    delete: override.canDelete,
    approve: override.canApprove,
    export: override.canExport,
  };
}

export function canPerformAction(permissionSet: PermissionSet, action: PermissionAction) {
  return permissionSet[action];
}

export function getSeedableRolePermissions(tenantId: string) {
  return Object.values(Role).flatMap((role) =>
    MODULE_KEYS.map((moduleKey) => {
      const permission = getDefaultRolePermissions(role)[moduleKey];

      return {
        tenantId,
        role,
        moduleKey,
        canView: permission.view,
        canAdd: permission.add,
        canEdit: permission.edit,
        canDelete: permission.delete,
        canApprove: permission.approve,
        canExport: permission.export,
      };
    }),
  );
}
