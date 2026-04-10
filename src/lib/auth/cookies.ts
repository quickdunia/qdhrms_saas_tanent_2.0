import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function getCookieConfig(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function readSessionCookie() {
  return cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function writeSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE_NAME, token, getCookieConfig(expiresAt));
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", getCookieConfig(new Date(0)));
}
