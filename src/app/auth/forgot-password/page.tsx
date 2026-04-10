import { OtpPurpose } from "@prisma/client";

import { PasswordRequestForm } from "@/components/auth/password-request-form";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { getSearchParamValue } from "@/lib/utils";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const status = getSearchParamValue(searchParams?.status);
  const message = getSearchParamValue(searchParams?.message);
  const email = getSearchParamValue(searchParams?.email);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Recovery
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Recover access with email OTP verification, then set a new secure password.
        </p>
      </div>

      <div className="space-y-8">
        <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6">
          <h2 className="text-lg font-semibold text-slate-950">1. Request OTP</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the email address tied to your workspace account.
          </p>
          <div className="mt-5">
            <PasswordRequestForm
              defaultEmail={email}
              message={message}
              purpose={OtpPurpose.RESET_PASSWORD}
              redirectTo="/auth/forgot-password"
              status={status}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6">
          <h2 className="text-lg font-semibold text-slate-950">2. Confirm and update</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Submit the OTP and your new password to restore access securely.
          </p>
          <div className="mt-5">
            <PasswordResetForm
              defaultEmail={email}
              purpose={OtpPurpose.RESET_PASSWORD}
              redirectTo="/auth/forgot-password"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
