import { Prisma, PrismaClient, Role, UserStatus } from "@prisma/client";

import { MODULE_KEYS } from "../src/lib/auth/constants";

const prisma = new PrismaClient();

const basePlans = [
  {
    code: "STARTER",
    name: "Starter",
    description: "Core HRMS for growing institutions and companies.",
    priceMonthly: new Prisma.Decimal("1499.00"),
    priceQuarterly: new Prisma.Decimal("3999.00"),
    priceYearly: new Prisma.Decimal("14999.00"),
    maxUsers: 50,
    maxEmployees: 150,
    maxColleges: 5,
    maxBranches: 10,
    maxDepartments: 25,
    storageLimitMb: 2048,
    renewalReminderDays: 7,
    moduleKeys: [
      "DASHBOARD",
      "ORGANIZATION",
      "SUBSCRIPTIONS",
      "USERS",
      "ROLES",
      "EMPLOYEES",
      "ATTENDANCE",
      "SHIFTS",
      "LEAVE",
      "HOLIDAYS",
      "ANNOUNCEMENTS",
      "APPROVALS",
      "NOTIFICATIONS",
      "REPORTS",
      "IMPORT_EXPORT",
      "SELF_SERVICE",
      "RECRUITMENT",
      "HELPDESK",
      "DOCUMENT_VAULT",
    ],
  },
  {
    code: "GROWTH",
    name: "Growth",
    description: "Advanced HRMS with payroll, audit, and richer reporting controls.",
    priceMonthly: new Prisma.Decimal("3999.00"),
    priceQuarterly: new Prisma.Decimal("10999.00"),
    priceYearly: new Prisma.Decimal("39999.00"),
    maxUsers: 250,
    maxEmployees: 1000,
    maxColleges: 25,
    maxBranches: 100,
    maxDepartments: 500,
    storageLimitMb: 8192,
    renewalReminderDays: 10,
    moduleKeys: [
      "DASHBOARD",
      "ORGANIZATION",
      "SUBSCRIPTIONS",
      "USERS",
      "ROLES",
      "EMPLOYEES",
      "ATTENDANCE",
      "SHIFTS",
      "LEAVE",
      "HOLIDAYS",
      "PAYROLL",
      "ANNOUNCEMENTS",
      "APPROVALS",
      "NOTIFICATIONS",
      "AUDIT_LOGS",
      "SETTINGS",
      "SECURITY",
      "REPORTS",
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
      "DOCUMENT_VAULT",
      "ADVANCED_ANALYTICS",
    ],
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "Full-suite multi-tenant HRMS with operational scale and maximum flexibility.",
    priceMonthly: new Prisma.Decimal("9999.00"),
    priceQuarterly: new Prisma.Decimal("28999.00"),
    priceYearly: new Prisma.Decimal("99999.00"),
    maxUsers: null,
    maxEmployees: null,
    maxColleges: null,
    maxBranches: null,
    maxDepartments: null,
    storageLimitMb: null,
    renewalReminderDays: 15,
    moduleKeys: MODULE_KEYS,
  },
];

const globalSettings = [
  {
    key: "platform.brandName",
    category: "platform",
    label: "Platform Brand Name",
    valueText: "QD HRMS Cloud",
  },
  {
    key: "platform.defaultThemeColor",
    category: "platform",
    label: "Default Theme Color",
    valueText: "#0f766e",
  },
  {
    key: "platform.defaultAttendanceSettings",
    category: "attendance",
    label: "Default Attendance Settings",
    valueJson: {
      lateGraceMinutes: 10,
      earlyExitGraceMinutes: 10,
      halfDayMinutes: 240,
      fullDayMinutes: 480,
      overtimeEnabled: true,
    },
  },
  {
    key: "platform.defaultPayrollSettings",
    category: "payroll",
    label: "Default Payroll Settings",
    valueJson: {
      payslipPrefix: "PS",
      defaultCurrency: "INR",
      payrollLockDay: 28,
      attendanceBasedPayroll: true,
    },
  },
  {
    key: "platform.integrationProviders",
    category: "integrations",
    label: "Default Integration Providers",
    valueJson: {
      biometric: true,
      faceRecognition: true,
      sms: true,
      payment: true,
      whatsapp: true,
      erp: true,
    },
  },
  {
    key: "platform.documentRetention",
    category: "documents",
    label: "Default Document Retention",
    valueJson: {
      expiryReminderDays: 30,
      allowEmployeeAccess: true,
      versioning: true,
    },
  },
];

async function seedPlans() {
  for (const plan of basePlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
}

async function seedGlobalSettings() {
  for (const setting of globalSettings) {
    await prisma.globalSetting.upsert({
      where: {
        key: setting.key,
      },
      update: setting,
      create: setting,
    });
  }
}

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "owner@example.com";
  const name = process.env.SUPER_ADMIN_NAME ?? "Platform Owner";
  const [firstName, ...rest] = name.trim().split(" ");

  await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName: rest.join(" ") || null,
      role: Role.SUPER_ADMIN,
      status: UserStatus.PENDING,
      tenantId: null,
    },
    create: {
      email,
      firstName,
      lastName: rest.join(" ") || null,
      role: Role.SUPER_ADMIN,
      status: UserStatus.PENDING,
      mustSetPassword: true,
    },
  });
}

async function main() {
  await seedPlans();
  await seedGlobalSettings();
  await seedSuperAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
