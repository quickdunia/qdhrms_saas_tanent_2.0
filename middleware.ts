import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname) || pathname === "/" || pathname.startsWith("/forbidden")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/super-admin")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (payload.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  if (pathname.startsWith("/t/")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (payload.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }

    if (!payload.tenantId) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
