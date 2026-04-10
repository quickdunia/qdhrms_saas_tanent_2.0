"use server";

import * as XLSX from "xlsx";
import { OtpPurpose, Role } from "@prisma/client";
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
import { prisma } from "@/lib/prisma";
import { isTruthyFormValue, parseFormData } from "@/lib/utils";
import {
  bulkImportContextSchema,
  createRolePermissionSchema,
  createUserSchema,
  updateUserStatusSchema,
} from "@/lib/validation/phase-one";

async function storeFileAssets({
  files,
  tenantId,
  ownerId,
  ownerType,
  uploadedById,
  category,
}: {
  files: File[];
  tenantId: string;
  ownerId: string;
  ownerType: "USER" | "EMPLOYEE";
  uploadedById: string;
  category: string;
}) {
  for (const file of files) {
    const uploaded = await saveUploadedFile(file, [tenantId, ownerType.toLowerCase(), ownerId]);

    if (!uploaded) {
      continue;
    }

    await prisma.fileAsset.create({
      data: {
        tenantId,
        ownerType,
        ownerId,
        category,
        originalName: uploaded.originalName,
        fileUrl: uploaded.fileUrl,
        filePath: uploaded.filePath,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        uploadedById,
      },
    });
  }
}

export async function createUserAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, `/t/${tenantSlug}/users`);

  try {
    const session = await requireTenantModulePermission(tenantSlug, "USERS", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);

    const parsed = createUserSchema.parse(rawData);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.email,
      },
    });

    if (existingUser) {
      redirectWithMessage(redirectTo, "error", "A user with that email already exists.");
    }

    const profilePhoto = formData.get("profilePhoto");
    const documentEntries = formData.getAll("documents");

    const createdUser = await prisma.user.create({
      data: {
        tenantId: session.tenant.id,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        role: parsed.role,
        status: parsed.status,
        collegeId: parsed.collegeId,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        mustSetPassword: true,
      },
    });

    if (profilePhoto instanceof File && profilePhoto.size > 0) {
      const uploaded = await saveUploadedFile(profilePhoto, [
        session.tenant.id,
        "user-profile",
        createdUser.id,
      ]);

      if (uploaded) {
        await prisma.user.update({
          where: {
            id: createdUser.id,
          },
          data: {
            avatarUrl: uploaded.fileUrl,
          },
        });

        await prisma.fileAsset.create({
          data: {
            tenantId: session.tenant.id,
            ownerType: "USER",
            ownerId: createdUser.id,
            category: "PROFILE_PHOTO",
            originalName: uploaded.originalName,
            fileUrl: uploaded.fileUrl,
            filePath: uploaded.filePath,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            uploadedById: session.user.id,
          },
        });
      }
    }

    const documents = documentEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    await storeFileAssets({
      files: documents,
      tenantId: session.tenant.id,
      ownerId: createdUser.id,
      ownerType: "USER",
      uploadedById: session.user.id,
      category: "DOCUMENT",
    });

    await issuePasswordOtp({
      user: {
        id: createdUser.id,
        tenantId: createdUser.tenantId,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        tenant: {
          name: session.tenant.name,
        },
      },
      purpose: OtpPurpose.CREATE_PASSWORD,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "USERS",
      action: "CREATE",
      entityType: "User",
      entityId: createdUser.id,
      summary: `Created user ${createdUser.email}.`,
    });

    revalidatePath(`/t/${tenantSlug}/users`);
    redirectWithMessage(redirectTo, "success", `User ${createdUser.email} created successfully.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the user."),
    );
  }
}

export async function updateUserStatusAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, `/t/${tenantSlug}/users`);

  try {
    const session = await requireTenantModulePermission(tenantSlug, "USERS", "edit", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);

    const parsed = updateUserStatusSchema.parse(rawData);

    const user = await prisma.user.update({
      where: {
        id: parsed.userId,
      },
      data: {
        status: parsed.status,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "USERS",
      action: "STATUS_UPDATE",
      entityType: "User",
      entityId: user.id,
      summary: `Updated user ${user.email} status to ${parsed.status}.`,
    });

    revalidatePath(`/t/${tenantSlug}/users`);
    redirectWithMessage(redirectTo, "success", `Updated ${user.email} successfully.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to update the user status."),
    );
  }
}

export async function sendUserPasswordResetOtpAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, `/t/${tenantSlug}/users`);

  try {
    const session = await requireTenantModulePermission(tenantSlug, "USERS", "edit", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);

    const userId = typeof rawData.userId === "string" ? rawData.userId : "";

    if (!userId) {
      redirectWithMessage(redirectTo, "error", "User is required.");
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: session.tenant.id,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      redirectWithMessage(redirectTo, "error", "User not found.");
    }

    await issuePasswordOtp({
      user,
      purpose: user.passwordHash ? OtpPurpose.RESET_PASSWORD : OtpPurpose.CREATE_PASSWORD,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "USERS",
      action: "RESET_PASSWORD",
      entityType: "User",
      entityId: user.id,
      summary: `Issued password OTP for ${user.email}.`,
    });

    redirectWithMessage(redirectTo, "success", `Password OTP sent to ${user.email}.`);
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to issue password reset OTP."),
    );
  }
}

export async function saveRolePermissionAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, `/t/${tenantSlug}/roles`);

  try {
    const session = await requireTenantModulePermission(tenantSlug, "ROLES", "edit", [
      Role.TENANT_ADMIN,
    ]);
    const parsed = createRolePermissionSchema.parse(rawData);

    await prisma.rolePermission.upsert({
      where: {
        tenantId_role_moduleKey: {
          tenantId: session.tenant.id,
          role: parsed.role,
          moduleKey: parsed.moduleKey,
        },
      },
      update: {
        canView: isTruthyFormValue(parsed.canView),
        canAdd: isTruthyFormValue(parsed.canAdd),
        canEdit: isTruthyFormValue(parsed.canEdit),
        canDelete: isTruthyFormValue(parsed.canDelete),
        canApprove: isTruthyFormValue(parsed.canApprove),
        canExport: isTruthyFormValue(parsed.canExport),
      },
      create: {
        tenantId: session.tenant.id,
        role: parsed.role,
        moduleKey: parsed.moduleKey,
        canView: isTruthyFormValue(parsed.canView),
        canAdd: isTruthyFormValue(parsed.canAdd),
        canEdit: isTruthyFormValue(parsed.canEdit),
        canDelete: isTruthyFormValue(parsed.canDelete),
        canApprove: isTruthyFormValue(parsed.canApprove),
        canExport: isTruthyFormValue(parsed.canExport),
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "ROLES",
      action: "UPSERT",
      entityType: "RolePermission",
      summary: `Updated ${parsed.role} permissions for ${parsed.moduleKey}.`,
    });

    revalidatePath(`/t/${tenantSlug}/roles`);
    redirectWithMessage(redirectTo, "success", "Role permission updated successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to save the role permission."),
    );
  }
}

export async function bulkImportRecordsAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const tenantSlug = typeof rawData.tenantSlug === "string" ? rawData.tenantSlug : "";
  const redirectTo = resolveRedirectPath(rawData.redirectTo, `/t/${tenantSlug}/imports`);

  try {
    const session = await requireTenantModulePermission(tenantSlug, "IMPORT_EXPORT", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.HR_EXECUTIVE,
    ]);
    const parsed = bulkImportContextSchema.parse(rawData);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirectWithMessage(redirectTo, "error", "Please choose an Excel file to import.");
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const errors: Array<{ row: number; error: string }> = [];
    let successRows = 0;

    const importJob = await prisma.importJob.create({
      data: {
        tenantId: session.tenant.id,
        userId: session.user.id,
        type: parsed.type,
        status: "PENDING",
        originalFileName: file.name,
      },
    });

    if (parsed.type === "USERS") {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const email = String(row.email ?? row.Email ?? "").trim().toLowerCase();
        const firstName = String(row.firstName ?? row["First Name"] ?? "").trim();
        const roleValue = String(row.role ?? row.Role ?? "EMPLOYEE").trim().toUpperCase();

        if (!email || !firstName) {
          errors.push({ row: index + 2, error: "Missing firstName or email." });
          continue;
        }

        if (!(roleValue in Role)) {
          errors.push({ row: index + 2, error: `Invalid role ${roleValue}.` });
          continue;
        }

        try {
          await prisma.user.create({
            data: {
              tenantId: session.tenant.id,
              firstName,
              lastName: String(row.lastName ?? row["Last Name"] ?? "").trim() || null,
              email,
              phone: String(row.phone ?? row.Phone ?? "").trim() || null,
              role: roleValue as Role,
              status: "PENDING",
              mustSetPassword: true,
            },
          });
          successRows += 1;
        } catch (error) {
          errors.push({
            row: index + 2,
            error: getActionErrorMessage(error, "Unable to import user row."),
          });
        }
      }
    }

    if (parsed.type === "EMPLOYEES") {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const employeeCode = String(row.employeeCode ?? row["Employee Code"] ?? "").trim();
        const firstName = String(row.firstName ?? row["First Name"] ?? "").trim();
        const branchCode = String(row.branchCode ?? row["Branch Code"] ?? "").trim();
        const departmentCode = String(row.departmentCode ?? row["Department Code"] ?? "").trim();

        if (!employeeCode || !firstName || !branchCode || !departmentCode) {
          errors.push({
            row: index + 2,
            error: "Missing employeeCode, firstName, branchCode, or departmentCode.",
          });
          continue;
        }

        const [branch, department] = await Promise.all([
          prisma.branch.findFirst({
            where: {
              tenantId: session.tenant.id,
              code: branchCode,
            },
          }),
          prisma.department.findFirst({
            where: {
              tenantId: session.tenant.id,
              code: departmentCode,
            },
          }),
        ]);

        if (!branch || !department) {
          errors.push({ row: index + 2, error: "Branch or department not found." });
          continue;
        }

        try {
          await prisma.employee.create({
            data: {
              tenantId: session.tenant.id,
              branchId: branch.id,
              departmentId: department.id,
              employeeCode,
              firstName,
              lastName: String(row.lastName ?? row["Last Name"] ?? "").trim() || null,
              jobTitle: String(row.jobTitle ?? row["Job Title"] ?? "Employee").trim(),
              joinDate: new Date(String(row.joinDate ?? row["Join Date"] ?? new Date().toISOString())),
              status: "ACTIVE",
              employmentType: "FULL_TIME",
            },
          });
          successRows += 1;
        } catch (error) {
          errors.push({
            row: index + 2,
            error: getActionErrorMessage(error, "Unable to import employee row."),
          });
        }
      }
    }

    await prisma.importJob.update({
      where: {
        id: importJob.id,
      },
      data: {
        totalRows: rows.length,
        successRows,
        failedRows: errors.length,
        status: errors.length > 0 ? (successRows > 0 ? "PARTIAL" : "FAILED") : "COMPLETED",
        errorReportJson: errors,
      },
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "IMPORT_EXPORT",
      action: "IMPORT",
      entityType: "ImportJob",
      entityId: importJob.id,
      summary: `Imported ${parsed.type.toLowerCase()} with ${successRows} successful rows.`,
      payload: {
        totalRows: rows.length,
        successRows,
        failedRows: errors.length,
      },
    });

    revalidatePath(`/t/${tenantSlug}/users`);
    revalidatePath(`/t/${tenantSlug}/employees`);
    revalidatePath(`/t/${tenantSlug}/imports`);

    redirectWithMessage(
      redirectTo,
      errors.length > 0 ? "error" : "success",
      errors.length > 0
        ? `Import completed with ${errors.length} error(s). Review the import history below.`
        : "Import completed successfully.",
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to process the import file."),
    );
  }
}
