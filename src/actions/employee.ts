"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getActionErrorMessage,
  redirectWithMessage,
  resolveRedirectPath,
  rethrowIfRedirectError,
} from "@/actions/helpers";
import { requireTenantModulePermission } from "@/lib/auth/guards";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/files/upload";
import { prisma } from "@/lib/prisma";
import { isTruthyFormValue, parseFormData } from "@/lib/utils";
import { createEmployeeSchema } from "@/lib/validation/employee";

async function saveEmployeeDocuments({
  tenantId,
  employeeId,
  userId,
  files,
}: {
  tenantId: string;
  employeeId: string;
  userId: string;
  files: File[];
}) {
  for (const file of files) {
    const uploaded = await saveUploadedFile(file, [tenantId, "employee", employeeId]);

    if (!uploaded) {
      continue;
    }

    await prisma.fileAsset.create({
      data: {
        tenantId,
        ownerType: "EMPLOYEE",
        ownerId: employeeId,
        category: "DOCUMENT",
        originalName: uploaded.originalName,
        fileUrl: uploaded.fileUrl,
        filePath: uploaded.filePath,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        uploadedById: userId,
      },
    });
  }
}

export async function createEmployeeAction(formData: FormData) {
  const rawData = parseFormData(formData);
  const redirectTo = resolveRedirectPath(
    rawData.redirectTo,
    typeof rawData.tenantSlug === "string" ? `/t/${rawData.tenantSlug}/employees` : "/",
  );

  try {
    const parsed = createEmployeeSchema.parse(rawData);
    const session = await requireTenantModulePermission(parsed.tenantSlug, "EMPLOYEES", "add", [
      Role.TENANT_ADMIN,
      Role.HR_MANAGER,
      Role.BRANCH_MANAGER,
      Role.DEPARTMENT_HEAD,
    ]);

    const [branch, department, college, manager, salaryStructure] = await Promise.all([
      prisma.branch.findFirst({
        where: {
          id: parsed.branchId,
          tenantId: session.tenant.id,
        },
      }),
      prisma.department.findFirst({
        where: {
          id: parsed.departmentId,
          tenantId: session.tenant.id,
        },
      }),
      parsed.collegeId
        ? prisma.college.findFirst({
            where: {
              id: parsed.collegeId,
              tenantId: session.tenant.id,
            },
          })
        : Promise.resolve(null),
      parsed.managerId
        ? prisma.employee.findFirst({
            where: {
              id: parsed.managerId,
              tenantId: session.tenant.id,
            },
          })
        : Promise.resolve(null),
      parsed.salaryStructureId
        ? prisma.salaryStructure.findFirst({
            where: {
              id: parsed.salaryStructureId,
              tenantId: session.tenant.id,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!branch) {
      redirectWithMessage(redirectTo, "error", "Select a valid branch or campus.");
    }

    if (!department || department.branchId !== parsed.branchId) {
      redirectWithMessage(redirectTo, "error", "Select a valid department for the chosen branch.");
    }

    if (parsed.collegeId && !college) {
      redirectWithMessage(redirectTo, "error", "Select a valid college or unit.");
    }

    if (parsed.managerId && !manager) {
      redirectWithMessage(redirectTo, "error", "Select a valid reporting manager.");
    }

    if (parsed.salaryStructureId && !salaryStructure) {
      redirectWithMessage(redirectTo, "error", "Select a valid salary structure.");
    }

    const createdEmployee = await prisma.employee.create({
      data: {
        tenantId: session.tenant.id,
        userAccountId: parsed.userAccountId,
        collegeId: parsed.collegeId,
        branchId: parsed.branchId,
        departmentId: parsed.departmentId,
        managerId: parsed.managerId,
        employeeCode: parsed.employeeCode.toUpperCase(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        workEmail: parsed.workEmail,
        personalEmail: parsed.personalEmail,
        phone: parsed.phone,
        alternatePhone: parsed.alternatePhone,
        dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
        gender: parsed.gender,
        maritalStatus: parsed.maritalStatus,
        bloodGroup: parsed.bloodGroup,
        nationality: parsed.nationality,
        currentAddress: parsed.currentAddress,
        permanentAddress: parsed.permanentAddress,
        emergencyContactName: parsed.emergencyContactName,
        emergencyContactPhone: parsed.emergencyContactPhone,
        jobTitle: parsed.jobTitle,
        designation: parsed.designation,
        employmentType: parsed.employmentType,
        status: parsed.status,
        joinDate: new Date(parsed.joinDate),
        confirmationDate: parsed.confirmationDate ? new Date(parsed.confirmationDate) : null,
        qualificationSummary: parsed.qualificationSummary,
        experienceSummary: parsed.experienceSummary,
        salary: parsed.salary ? Number(parsed.salary) : null,
        salaryStructureId: parsed.salaryStructureId,
        bankAccountName: parsed.bankAccountName,
        bankAccountNumber: parsed.bankAccountNumber,
        bankIfscCode: parsed.bankIfscCode,
        bonusEligible: isTruthyFormValue(parsed.bonusEligible),
        createdById: session.user.id,
      },
    });

    const profilePhoto = formData.get("profilePhoto");
    if (profilePhoto instanceof File && profilePhoto.size > 0) {
      const uploaded = await saveUploadedFile(profilePhoto, [
        session.tenant.id,
        "employee-profile",
        createdEmployee.id,
      ]);

      if (uploaded) {
        await prisma.employee.update({
          where: {
            id: createdEmployee.id,
          },
          data: {
            profilePhotoUrl: uploaded.fileUrl,
          },
        });

        await prisma.fileAsset.create({
          data: {
            tenantId: session.tenant.id,
            ownerType: "EMPLOYEE",
            ownerId: createdEmployee.id,
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

    const documents = formData
      .getAll("documents")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    await saveEmployeeDocuments({
      tenantId: session.tenant.id,
      employeeId: createdEmployee.id,
      userId: session.user.id,
      files: documents,
    });

    await createAuditLog({
      tenantId: session.tenant.id,
      userId: session.user.id,
      moduleKey: "EMPLOYEES",
      action: "CREATE",
      entityType: "Employee",
      entityId: createdEmployee.id,
      summary: `Created employee ${createdEmployee.employeeCode}.`,
    });

    revalidatePath(`/t/${parsed.tenantSlug}`);
    revalidatePath(`/t/${parsed.tenantSlug}/employees`);

    redirectWithMessage(redirectTo, "success", "Employee created successfully.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithMessage(
      redirectTo,
      "error",
      getActionErrorMessage(error, "Unable to create the employee."),
    );
  }
}
