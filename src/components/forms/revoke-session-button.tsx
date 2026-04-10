import { revokeSessionAction } from "@/actions/security";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

export function RevokeSessionButton({
  sessionId,
  redirectTo,
  label = "Revoke",
}: {
  sessionId: string;
  redirectTo: string;
  label?: string;
}) {
  return (
    <form action={revokeSessionAction}>
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <FormSubmitButton size="sm" variant="outline">
        {label}
      </FormSubmitButton>
    </form>
  );
}
