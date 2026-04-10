import { OtpPurpose } from "@prisma/client";

import { requestPasswordOtpAction } from "@/actions/auth";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordRequestForm({
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
    <form action={requestPasswordOtpAction} className="space-y-5">
      <input name="purpose" type="hidden" value={purpose} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <FeedbackAlert status={status} message={message} />

      <div className="space-y-2">
        <Label htmlFor={`${purpose}-email`}>Registered email</Label>
        <Input
          defaultValue={defaultEmail}
          id={`${purpose}-email`}
          name="email"
          placeholder="owner@example.com"
        />
      </div>

      <FormSubmitButton className="w-full" variant="brand">
        {purpose === OtpPurpose.CREATE_PASSWORD ? "Send setup OTP" : "Send reset OTP"}
      </FormSubmitButton>
    </form>
  );
}
