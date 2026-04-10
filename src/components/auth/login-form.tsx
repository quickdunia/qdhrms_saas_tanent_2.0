import Link from "next/link";

import { loginAction } from "@/actions/auth";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  status,
  message,
  defaultEmail,
  redirectTo = "/auth/login",
}: {
  status?: string;
  message?: string;
  defaultEmail?: string;
  redirectTo?: string;
}) {
  return (
    <form action={loginAction} className="space-y-5">
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <FeedbackAlert status={status} message={message} />

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input defaultValue={defaultEmail} id="email" name="email" placeholder="you@company.com" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <Link
            className="text-sm font-medium text-[var(--brand)] transition hover:opacity-80"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" placeholder="Enter your password" type="password" />
      </div>

      <FormSubmitButton className="w-full" variant="brand">
        Sign in securely
      </FormSubmitButton>
    </form>
  );
}
