import { SubscriptionStatus, TenantType } from "@prisma/client";
import { z } from "zod";

import {
  hexColorSchema,
  optionalEmailSchema,
  optionalTextSchema,
  optionalUrlSchema,
  safeRedirectSchema,
} from "@/lib/validation/shared";

export const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Tenant name is required."),
  slug: optionalTextSchema,
  legalName: optionalTextSchema,
  type: z.nativeEnum(TenantType),
  adminFirstName: z.string().trim().min(2, "Admin first name is required."),
  adminLastName: optionalTextSchema,
  adminEmail: z.string().trim().email("Enter a valid admin email."),
  adminPhone: optionalTextSchema,
  supportEmail: optionalEmailSchema,
  website: optionalUrlSchema,
  logoUrl: optionalUrlSchema,
  domain: optionalTextSchema,
  subdomain: optionalTextSchema,
  sessionYear: optionalTextSchema,
  financialYear: optionalTextSchema,
  themeColor: hexColorSchema,
  accentColor: hexColorSchema,
  planId: z.string().trim().min(1, "Select a subscription plan."),
  redirectTo: safeRedirectSchema,
});

export const updateSubscriptionSchema = z.object({
  tenantId: z.string().trim().min(1),
  planId: z.string().trim().min(1, "Select a subscription plan."),
  status: z.nativeEnum(SubscriptionStatus),
  endsAt: optionalTextSchema,
  moduleOverrides: optionalTextSchema,
  redirectTo: safeRedirectSchema,
});

export const tenantBrandingSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Tenant name is required."),
  legalName: optionalTextSchema,
  tagline: optionalTextSchema,
  description: optionalTextSchema,
  website: optionalUrlSchema,
  logoUrl: optionalUrlSchema,
  supportEmail: optionalEmailSchema,
  phone: optionalTextSchema,
  domain: optionalTextSchema,
  subdomain: optionalTextSchema,
  sessionYear: optionalTextSchema,
  financialYear: optionalTextSchema,
  status: z
    .enum(["ACTIVE", "TRIALING", "HOLD", "SUSPENDED", "INACTIVE", "DELETED"])
    .optional(),
  addressLine1: optionalTextSchema,
  addressLine2: optionalTextSchema,
  city: optionalTextSchema,
  state: optionalTextSchema,
  country: optionalTextSchema,
  postalCode: optionalTextSchema,
  timezone: z.string().trim().min(1, "Timezone is required."),
  currency: z.string().trim().min(1, "Currency is required."),
  locale: z.string().trim().min(1, "Locale is required."),
  themeColor: hexColorSchema,
  accentColor: hexColorSchema,
  redirectTo: safeRedirectSchema,
});
