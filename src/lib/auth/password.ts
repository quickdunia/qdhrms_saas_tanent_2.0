import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";

import { OTP_LENGTH } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/env";

const PASSWORD_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateOtpCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;

  return randomInt(min, max).toString();
}

export function hashOtpCode(email: string, purpose: string, code: string) {
  const env = getServerEnv();
  const secret = env.OTP_SECRET ?? env.AUTH_SECRET;

  return createHash("sha256").update(`${email}:${purpose}:${code}:${secret}`).digest("hex");
}
