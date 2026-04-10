export const SESSION_COOKIE_NAME = "qdhrms_session";
export const SESSION_ISSUER = "qdhrms-platform";
export const OTP_LENGTH = 6;

export const MODULE_KEYS = [
  "DASHBOARD",
  "ORGANIZATION",
  "SUBSCRIPTIONS",
  "USERS",
  "ROLES",
  "EMPLOYEES",
  "ATTENDANCE",
  "SHIFTS",
  "SECURITY",
  "HOLIDAYS",
  "ANNOUNCEMENTS",
  "APPROVALS",
  "NOTIFICATIONS",
  "AUDIT_LOGS",
  "SETTINGS",
  "REPORTS",
  "LEAVE",
  "PAYROLL",
  "IMPORT_EXPORT",
  "SELF_SERVICE",
  "RECRUITMENT",
  "ONBOARDING",
  "OFFBOARDING",
  "ASSET_MANAGEMENT",
  "HELPDESK",
  "DYNAMIC_FORMS",
  "PERFORMANCE",
  "TRAINING",
  "WORKFLOWS",
  "INTEGRATIONS",
  "DOCUMENT_VAULT",
  "ADVANCED_ANALYTICS",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const PERMISSION_ACTIONS = [
  "view",
  "add",
  "edit",
  "delete",
  "approve",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
