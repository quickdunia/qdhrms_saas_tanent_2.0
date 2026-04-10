"use server";

import { addDays } from "date-fns";
import { OtpPurpose, TenantStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { issuePasswordOtp } from "@/lib/auth/otp";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { MODULE_KEYS } from "@/lib/auth/constants";
import { getSeedableRolePermissions } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/files/upload";
import { prisma } from "@/lib/prisma";
import { slugify, parseFormData } from "@/lib/utils";
import {
  createGlobalSettingSchema,
  createPlanSchema,
  updateSubscriptionExtendedSchema,
  updateTenantStatusSchema,
} from "@/lib/validation/phase-one";
import { createTenantSchema } from "@/lib/validation/tenant";

function parseModuleOverrides(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const modules = value
    .split(",")
    .map((moduleName) => moduleName.trim().toUpperCase())
    .filter((moduleName): moduleName is (typeof MODULE_KEYS)[number] =>
      MODULE_KEYS.includes(moduleName as (typeof MODULE_KEYS)[number]),
    );

  return modules.length > 0 ? modules : undefined;
}

function parseNumericLimit(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseModuleKeys(value: string) {
  const modules = value
    .split(",")
    .map((moduleKey) => moduleKey.trim().toUpperCase())
    .filter((moduleKey): moduleKey is (typeof MODULE_KEYS)[number] =>
      MODULE_KEYS.includes(moduleKey as (typeof MODULE_KEYS)[number]),
    );

  return modules.length > 0 ? modules : ["DASHBOARD"];
}

function resolveTenantStatusForSubscription(status: string) {
  if (status === "ACTIVE" || status === "TRIAL") {
    return TenantStatus.ACTIVE;
  }

  if (status === "PAUSED") {
    return TenantStatus.HOLD;
  }

  if (status === "EXPIRED" || status === "CANCELED" || status === "PAST_DUE") {
    return TenantStatus.SUSPENDED;
  }

  return TenantStatus.TRIALING;
}

export async function createTenantAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/super-admin/tenants");

  try {
    const session = await requireSuperAdmin();

    const parsed = createTenantSchema.parse(rawData);
    const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.name);
    const logoFile = formData.get("logoFile");

    if (!slug) {
      redirectWithMessage(redirectTo, "error", "Please provide a valid tenant slug.");
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: {
        slug,
      },
    });

    if (existingTenant) {
      redirectWithMessage(redirectTo, "error", "That tenant slug is already in use.");
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        id: parsed.planId,
      },
    });

    if (!plan) {
      redirectWithMessage(redirectTo, "error", "Select a valid subscription plan.");
    }

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: parsed.adminEmail,
      },
    });

    if (existingAdmin) {
      redirectWithMessage(redirectTo, "error", "A user with that admin email already exists.");
    }

    let logoUrl = parsed.logoUrl;
    if (logoFile instanceof File && logoFile.size > 0) {
      const uploadedLogo = await saveUploadedFile(logoFile, [slug || parsed.name, "tenant-logo"], {
        kind: "image",
      });
      logoUrl = uploadedLogo?.fileUrl ?? logoUrl;
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: parsed.name,
          legalName: parsed.legalName,
          type: parsed.type,
          status: "TRIALING",
          themeColor: parsed.themeColor,
          accentColor: parsed.accentColor,
          logoUrl,
          website: parsed.website,
          supportEmail: parsed.supportEmail,
          domain: parsed.domain,
          subdomain: parsed.subdomain,
          sessionYear: parsed.sessionYear,
          financialYear: parsed.financialYear,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: parsed.adminFirstName,
          lastName: parsed.adminLastName,
          email: parsed.adminEmail,
          phone: parsed.adminPhone,
          role: "TENANT_ADMIN",
          status: "PENDING",
          mustSetPassword: true,
        },
        include: {
          tenant: true,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "TRIAL",
          billingCycle: "MONTHLY",
          startsAt: new Date(),
          endsAt: addDays(new Date(), 30),
        },
      });

      await tx.tenantSetting.create({
        data: {
          tenantId: tenant.id,
          companySettings: {
            supportEmail: parsed.supportEmail,
            website: parsed.website,
          },
          attendanceSettings: {
            lateGraceMinutes: 10,
            earlyExitGraceMinutes: 10,
            halfDayMinutes: 240,
            fullDayMinutes: 480,
          },
          leaveSettings: {
            defaultApprovalRequired: true,
            allowHalfDay: true,
            allowShortLeave: true,
          },
          payrollSettings: {
            payslipPrefix: "PS",
            payrollLockDay: 28,
            attendanceBasedPayroll: true,
          },
          idGenerationRules: {
            employeePrefix: "EMP",
            payrollPrefix: "PAY",
          },
        },
      });

      await tx.rolePermission.createMany({
        data: getSeedableRolePermissions(tenant.id),
      });

      return {
        tenant,
        user,
      };
    });

    await issuePasswordOtp({
      user: result.user,
      purpose: OtpPurpose.CREATE_PASSWORD,
    });

    await createAuditLog({
      tenantId: null,
      userId: session.user.id,
      moduleKey: "SUBSCRIPTIONS",
      action: "CREATE",
      entityType: "Tenant",
      entityId: result.tenant.id,
      summary: `Created tenant ${result.tenant.name} and invited ${result.user.email}.`,
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");

    redirectWithMessage(
      redirectTo,
      "success",
      `Tenant ${result.tenant.name} created and OTP sent to ${result.user.email}.`,
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the tenant."),
    );
  }
}

export async function updateTenantStatusAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/super-admin/tenants");

  try {
    const session = await requireSuperAdmin();
    const parsed = updateTenantStatusSchema.parse(rawData);

    const tenant = await prisma.tenant.update({
      where: {
        id: parsed.tenantId,
      },
      data: {
        status: parsed.status,
        deletedAt: parsed.status === "DELETED" ? new Date() : null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      moduleKey: "SUBSCRIPTIONS",
      action: "STATUS_UPDATE",
      entityType: "Tenant",
      entityId: tenant.id,
      summary: `Updated tenant ${tenant.name} status to ${parsed.status}.`,
      payload: parsed,
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");

    redirectWithMessage(redirectTo, "success", `Tenant ${tenant.name} status updated.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to update the tenant status."),
    );
  }
}

export async function createSubscriptionPlanAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/super-admin/plans");

  try {
    const session = await requireSuperAdmin();
    const parsed = createPlanSchema.parse(rawData);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        code: parsed.code.toUpperCase(),
        name: parsed.name,
        description: parsed.description,
        priceMonthly: parsed.priceMonthly,
        priceQuarterly: parsed.priceQuarterly,
        priceYearly: parsed.priceYearly,
        maxUsers: parseNumericLimit(parsed.maxUsers),
        maxEmployees: parseNumericLimit(parsed.maxEmployees),
        maxColleges: parseNumericLimit(parsed.maxColleges),
        maxBranches: parseNumericLimit(parsed.maxBranches),
        maxDepartments: parseNumericLimit(parsed.maxDepartments),
        storageLimitMb: parseNumericLimit(parsed.storageLimitMb),
        renewalReminderDays: parsed.renewalReminderDays,
        moduleKeys: parseModuleKeys(parsed.moduleKeys),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      moduleKey: "SUBSCRIPTIONS",
      action: "CREATE",
      entityType: "SubscriptionPlan",
      entityId: plan.id,
      summary: `Created subscription plan ${plan.name}.`,
    });

    revalidatePath("/super-admin/plans");
    revalidatePath("/super-admin");

    redirectWithMessage(redirectTo, "success", `Plan ${plan.name} created successfully.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the subscription plan."),
    );
  }
}

export async function updateTenantSubscriptionAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/super-admin/tenants");

  try {
    const session = await requireSuperAdmin();
    const parsed = updateSubscriptionExtendedSchema.parse(rawData);
    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        id: parsed.planId,
      },
    });

    if (!plan) {
      redirectWithMessage(redirectTo, "error", "Select a valid subscription plan.");
    }

    const latestSubscription = await prisma.tenantSubscription.findFirst({
      where: {
        tenantId: parsed.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = {
      planId: parsed.planId,
      status: parsed.status,
      billingCycle: parsed.billingCycle,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      moduleOverrides: parseModuleOverrides(parsed.moduleOverrides),
    };

    if (latestSubscription) {
      await prisma.tenantSubscription.update({
        where: {
          id: latestSubscription.id,
        },
        data,
      });
    } else {
      await prisma.tenantSubscription.create({
        data: {
          tenantId: parsed.tenantId,
          startsAt: new Date(),
          ...data,
        },
      });
    }

    await prisma.tenant.update({
      where: {
        id: parsed.tenantId,
      },
      data: {
        status: resolveTenantStatusForSubscription(parsed.status),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      moduleKey: "SUBSCRIPTIONS",
      action: "UPDATE",
      entityType: "TenantSubscription",
      entityId: parsed.tenantId,
      summary: `Updated tenant subscription to ${plan.name} (${parsed.billingCycle}).`,
      payload: parsed,
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");
    revalidatePath("/super-admin/plans");

    redirectWithMessage(redirectTo, "success", "Subscription updated successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to update the subscription."),
    );
  }
}

export async function saveGlobalSettingAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/super-admin/settings");

  try {
    const session = await requireSuperAdmin();
    const parsed = createGlobalSettingSchema.parse(rawData);

    const setting = await prisma.globalSetting.upsert({
      where: {
        key: parsed.key,
      },
      update: {
        category: parsed.category,
        label: parsed.label,
        valueText: parsed.valueText,
        valueJson: parsed.valueJson ? JSON.parse(parsed.valueJson) : undefined,
      },
      create: {
        key: parsed.key,
        category: parsed.category,
        label: parsed.label,
        valueText: parsed.valueText,
        valueJson: parsed.valueJson ? JSON.parse(parsed.valueJson) : undefined,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      moduleKey: "SETTINGS",
      action: "UPSERT",
      entityType: "GlobalSetting",
      entityId: setting.id,
      summary: `Saved global setting ${setting.key}.`,
    });

    revalidatePath("/super-admin/settings");

    redirectWithMessage(redirectTo, "success", "Global setting saved successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to save the global setting."),
    );
  }
}
