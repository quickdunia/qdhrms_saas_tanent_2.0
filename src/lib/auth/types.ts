import type { Role, SubscriptionStatus, TenantStatus, UserStatus } from "@prisma/client";

import type { ModuleKey } from "@/lib/auth/constants";

export type SessionTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  tenantId: string | null;
  sessionId: string;
  firstName: string;
  lastName: string | null;
  exp: number;
  iat: number;
};

export type AppSession = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    role: Role;
    status: UserStatus;
    tenantId: string | null;
  };
  session: {
    id: string;
    tokenId: string;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
  };
  tenant: null | {
    id: string;
    slug: string;
    name: string;
    status: TenantStatus;
    logoUrl: string | null;
    themeColor: string;
    accentColor: string;
    allowedModules: ModuleKey[];
    subscription: null | {
      id: string;
      status: SubscriptionStatus;
      planCode: string;
      planName: string;
      endsAt: Date | null;
    };
  };
};
