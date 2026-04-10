import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { getSearchParamValue } from "@/lib/utils";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);
  const email = getSearchParamValue(searchParams?.email);

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
        Secure sign in
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Access your workspace
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Sign in with your registered email and password. Tenant routing and role access are
        determined automatically after authentication.
      </p>

      <div className="mt-8">
        <LoginForm defaultEmail={email} message={message} redirectTo="/auth/login" status={status} />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
        <Link className="font-medium text-[var(--brand)]" href="/auth/create-password">
          Create password
        </Link>
        <Link className="font-medium text-[var(--brand)]" href="/auth/forgot-password">
          Forgot password
        </Link>
      </div>
    </div>
  );
}
