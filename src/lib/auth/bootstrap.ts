import { Role, UserStatus } from "@prisma/client";

import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function ensureSuperAdminUser() {
  const env = getServerEnv();
  const [firstName, ...rest] = env.SUPER_ADMIN_NAME.trim().split(" ");

  return prisma.user.upsert({
    where: {
      email: env.SUPER_ADMIN_EMAIL,
    },
    update: {
      firstName,
      lastName: rest.join(" ") || null,
      role: Role.SUPER_ADMIN,
      tenantId: null,
    },
    create: {
      email: env.SUPER_ADMIN_EMAIL,
      firstName,
      lastName: rest.join(" ") || null,
      role: Role.SUPER_ADMIN,
      status: UserStatus.PENDING,
      mustSetPassword: true,
    },
  });
}
