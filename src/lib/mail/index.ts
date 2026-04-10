import nodemailer from "nodemailer";

import { getServerEnv, isMailConfigured } from "@/lib/env";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const env = getServerEnv();

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  });

  return cachedTransporter;
}

export async function sendMail(payload: MailPayload) {
  const env = getServerEnv();

  if (!isMailConfigured()) {
    console.info(
      `[mail fallback] to=${payload.to} subject=${payload.subject}\n${payload.text}`,
    );

    return {
      delivered: false,
      mode: "console",
    };
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  return {
    delivered: true,
    mode: "smtp",
  };
}
