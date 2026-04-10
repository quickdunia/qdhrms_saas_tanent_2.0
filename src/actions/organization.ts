"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { requireTenantAccess } from "@/lib/auth/guards";
import { saveUploadedFile } from "@/lib/files/upload";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/utils";
import {
  createBranchSchema,
  createCollegeSchema,
  createDepartmentSchema,
} from "@/lib/validation/organization";
import { tenantBrandingSchema } from "@/lib/validation/tenant";

export async function updateTenantBrandingAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/");

  try {
    const parsed = tenantBrandingSchema.parse(rawData);
    const session = await requireTenantAccess(parsed.tenantSlug, [Role.TENANT_ADMIN]);
    const logoFile = formData.get("logoFile");
    let logoUrl = parsed.logoUrl;

    if (logoFile instanceof File && logoFile.size > 0) {
      const uploadedLogo = await saveUploadedFile(logoFile, [session.tenant.id, "tenant-logo"], {
        kind: "image",
      });
      logoUrl = uploadedLogo?.fileUrl ?? logoUrl;
    }

    await prisma.tenant.update({
      where: {
        id: session.tenant.id,
      },
      data: {
        name: parsed.name,
        legalName: parsed.legalName,
        tagline: parsed.tagline,
        description: parsed.description,
        website: parsed.website,
        logoUrl,
        supportEmail: parsed.supportEmail,
        phone: parsed.phone,
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2,
        city: parsed.city,
        state: parsed.state,
        country: parsed.country,
        postalCode: parsed.postalCode,
        timezone: parsed.timezone,
        currency: parsed.currency,
        locale: parsed.locale,
        themeColor: parsed.themeColor,
        accentColor: parsed.accentColor,
      },
    });

    revalidatePath(`/t/${parsed.tenantSlug}`);
    revalidatePath(`/t/${parsed.tenantSlug}/settings`);

    redirectWithMessage(redirectTo, "success", "Branding and organization settings updated.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to update tenant branding."),
    );
  }
}

export async function createCollegeAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/");

  try {
    const parsed = createCollegeSchema.parse(rawData);
    const session = await requireTenantAccess(parsed.tenantSlug, [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.BRANCH_MANAGER,
    ]);

    await prisma.college.create({
      data: {
        tenantId: session.tenant.id,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        type: parsed.type,
        email: parsed.email,
        phone: parsed.phone,
        address: parsed.address,
      },
    });

    revalidatePath(`/t/${parsed.tenantSlug}`);
    revalidatePath(`/t/${parsed.tenantSlug}/colleges`);

    redirectWithMessage(redirectTo, "success", "College or unit created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the college or unit."),
    );
  }
}

export async function createBranchAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/");

  try {
    const parsed = createBranchSchema.parse(rawData);
    const session = await requireTenantAccess(parsed.tenantSlug, [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.BRANCH_MANAGER,
    ]);

    const college = await prisma.college.findFirst({
      where: {
        id: parsed.collegeId,
        tenantId: session.tenant.id,
      },
    });

    if (!college) {
      redirectWithMessage(redirectTo, "error", "Select a valid college or unit.");
    }

    await prisma.branch.create({
      data: {
        tenantId: session.tenant.id,
        collegeId: parsed.collegeId,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        type: parsed.type,
        email: parsed.email,
        phone: parsed.phone,
        address: parsed.address,
      },
    });

    revalidatePath(`/t/${parsed.tenantSlug}`);
    revalidatePath(`/t/${parsed.tenantSlug}/branches`);

    redirectWithMessage(redirectTo, "success", "Branch or campus created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the branch or campus."),
    );
  }
}

export async function createDepartmentAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(rawData.redirectTo, "/");

  try {
    const parsed = createDepartmentSchema.parse(rawData);
    const session = await requireTenantAccess(parsed.tenantSlug, [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.BRANCH_MANAGER,
    ]);

    const branch = await prisma.branch.findFirst({
      where: {
        id: parsed.branchId,
        tenantId: session.tenant.id,
      },
    });

    if (!branch) {
      redirectWithMessage(redirectTo, "error", "Select a valid branch or campus.");
    }

    await prisma.department.create({
      data: {
        tenantId: session.tenant.id,
        branchId: parsed.branchId,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        description: parsed.description,
      },
    });

    revalidatePath(`/t/${parsed.tenantSlug}`);
    revalidatePath(`/t/${parsed.tenantSlug}/departments`);

    redirectWithMessage(redirectTo, "success", "Department created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the department."),
    );
  }
}
