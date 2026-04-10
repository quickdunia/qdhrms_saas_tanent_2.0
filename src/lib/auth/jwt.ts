import type { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";

import { SESSION_ISSUER } from "@/lib/auth/constants";
import type { SessionTokenPayload } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";

function getSigningKey() {
  return new TextEncoder().encode(getServerEnv().AUTH_SECRET);
}

type SignSessionInput = {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
  sessionId: string;
  firstName: string;
  lastName: string | null;
  expiresAt: Date;
};

export async function signSessionToken(input: SignSessionInput) {
  return new SignJWT({
    email: input.email,
    role: input.role,
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    firstName: input.firstName,
    lastName: input.lastName,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(input.expiresAt)
    .sign(getSigningKey());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: SESSION_ISSUER,
    });

    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: payload.role as Role,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      sessionId: String(payload.sessionId),
      firstName: String(payload.firstName),
      lastName: payload.lastName ? String(payload.lastName) : null,
      exp: Number(payload.exp),
      iat: Number(payload.iat),
    };
  } catch {
    return null;
  }
}
