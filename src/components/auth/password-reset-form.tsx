import { OtpPurpose } from "@prisma/client";

import { resetPasswordWithOtpAction } from "@/actions/auth";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordResetForm({
  purpose,
  defaultEmail,
  status,
  message,
  redirectTo,
}: {
  purpose: OtpPurpose;
  defaultEmail?: string;
  status?: string;
  message?: string;
  redirectTo: string;
}) {
  return (
    <form action={resetPasswordWithOtpAction} className="space-y-5">
      <input name="purpose" type="hidden" value={purpose} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <FeedbackAlert status={status} message={message} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${purpose}-reset-email`}>Registered email</Label>
          <Input
            defaultValue={defaultEmail}
            id={`${purpose}-reset-email`}
            name="email"
            placeholder="owner@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${purpose}-code`}>OTP code</Label>
          <Input id={`${purpose}-code`} name="code" placeholder="123456" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${purpose}-password`}>New password</Label>
          <Input
            id={`${purpose}-password`}
            name="password"
            placeholder="Choose a secure password"
            type="password"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${purpose}-confirm-password`}>Confirm password</Label>
          <Input
            id={`${purpose}-confirm-password`}
            name="confirmPassword"
            placeholder="Repeat the new password"
            type="password"
          />
        </div>
      </div>

      <FormSubmitButton className="w-full" variant="brand">
        {purpose === OtpPurpose.CREATE_PASSWORD ? "Create password" : "Reset password"}
      </FormSubmitButton>
    </form>
  );
}
