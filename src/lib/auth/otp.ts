import { addMinutes } from "date-fns";
import { OtpPurpose, type Tenant, type User } from "@prisma/client";

import { hashOtpCode, generateOtpCode } from "@/lib/auth/password";
import { getServerEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

type OtpUser = Pick<User, "id" | "tenantId" | "email" | "firstName" | "lastName"> & {
  tenant?: Pick<Tenant, "name"> | null;
};

export async function issuePasswordOtp({
  user,
  purpose,
}: {
  user: OtpUser;
  purpose: OtpPurpose;
}) {
  const env = getServerEnv();
  const code = generateOtpCode();
  const expiresAt = addMinutes(new Date(), env.OTP_EXPIRY_MINUTES);

  await prisma.otpToken.updateMany({
    where: {
      email: user.email,
      purpose,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  await prisma.otpToken.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      purpose,
      codeHash: hashOtpCode(user.email, purpose, code),
      expiresAt,
    },
  });

  const greeting = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const heading =
    purpose === OtpPurpose.CREATE_PASSWORD ? "Create your password" : "Reset your password";
  const tenantLine = user.tenant?.name ? `Tenant: ${user.tenant.name}\n` : "";

  await sendMail({
    to: user.email,
    subject: `${heading} for QD HRMS Cloud`,
    text: `${greeting || "Hello"},\n\nUse OTP ${code} to ${
      purpose === OtpPurpose.CREATE_PASSWORD ? "create" : "reset"
    } your password. This code expires in ${env.OTP_EXPIRY_MINUTES} minutes.\n${tenantLine}\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:32px;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; padding:32px; box-shadow:0 18px 45px -24px rgba(15,23,42,0.28);">
          <p style="margin:0 0 12px; color:#0f172a; font-size:14px;">QD HRMS Cloud</p>
          <h1 style="margin:0 0 12px; color:#0f172a; font-size:28px;">${heading}</h1>
          <p style="margin:0 0 18px; color:#475569; line-height:1.7;">
            ${
              greeting ? `Hi ${greeting},` : "Hello,"
            } use the one-time password below to complete your security verification.
          </p>
          <div style="padding:20px 24px; border-radius:18px; background:#0f172a; color:#ffffff; font-size:36px; letter-spacing:12px; text-align:center; font-weight:700;">
            ${code}
          </div>
          <p style="margin:18px 0 0; color:#475569; line-height:1.7;">
            This code expires in ${env.OTP_EXPIRY_MINUTES} minutes.
          </p>
          ${
            user.tenant?.name
              ? `<p style="margin:10px 0 0; color:#475569;">Tenant: <strong>${user.tenant.name}</strong></p>`
              : ""
          }
        </div>
      </div>
    `,
  });

  return {
    expiresAt,
  };
}

export async function consumePasswordOtp({
  email,
  code,
  purpose,
}: {
  email: string;
  code: string;
  purpose: OtpPurpose;
}) {
  const token = await prisma.otpToken.findFirst({
    where: {
      email,
      purpose,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          tenant: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!token) {
    return null;
  }

  const matches = token.codeHash === hashOtpCode(email, purpose, code);

  if (!matches) {
    await prisma.otpToken.update({
      where: {
        id: token.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return null;
  }

  await prisma.otpToken.update({
    where: {
      id: token.id,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  return token;
}
