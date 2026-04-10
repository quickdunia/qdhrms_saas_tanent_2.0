import { OtpPurpose } from "@prisma/client";

import { PasswordRequestForm } from "@/components/auth/password-request-form";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { getSearchParamValue } from "@/lib/utils";

export default function CreatePasswordPage({
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
          First-time access
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Create your secure password
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Super admins and tenant admins can create their password only after verifying a one-time
          email OTP.
        </p>
      </div>

      <div className="space-y-8">
        <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6">
          <h2 className="text-lg font-semibold text-slate-950">1. Request OTP</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the registered email address to receive a password setup OTP.
          </p>
          <div className="mt-5">
            <PasswordRequestForm
              defaultEmail={email}
              message={message}
              purpose={OtpPurpose.CREATE_PASSWORD}
              redirectTo="/auth/create-password"
              status={status}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6">
          <h2 className="text-lg font-semibold text-slate-950">2. Set password</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use the OTP to verify ownership and create a strong password for future sign-ins.
          </p>
          <div className="mt-5">
            <PasswordResetForm
              defaultEmail={email}
              purpose={OtpPurpose.CREATE_PASSWORD}
              redirectTo="/auth/create-password"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
