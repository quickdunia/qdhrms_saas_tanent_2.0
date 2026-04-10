import { BranchType, CollegeType } from "@prisma/client";
import { z } from "zod";

import {
  optionalEmailSchema,
  optionalTextSchema,
  safeRedirectSchema,
} from "@/lib/validation/shared";

export const createCollegeSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, "College or unit name is required."),
  code: z.string().trim().min(2, "Code is required."),
  type: z.nativeEnum(CollegeType),
  email: optionalEmailSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createBranchSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  collegeId: z.string().trim().min(1, "Select a college or unit."),
  name: z.string().trim().min(2, "Branch or campus name is required."),
  code: z.string().trim().min(2, "Code is required."),
  type: z.nativeEnum(BranchType),
  email: optionalEmailSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const createDepartmentSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  branchId: z.string().trim().min(1, "Select a branch or campus."),
  name: z.string().trim().min(2, "Department name is required."),
  code: z.string().trim().min(2, "Code is required."),
  description: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});
